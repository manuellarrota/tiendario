package com.tiendario.web;

import com.tiendario.domain.User;
import com.tiendario.payload.request.LoginRequest;
import com.tiendario.payload.request.SignupRequest;
import com.tiendario.payload.response.JwtResponse;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.UserRepository;
import com.tiendario.security.JwtUtils;
import com.tiendario.security.LoginRateLimiter;
import com.tiendario.security.UserDetailsImpl;
import com.tiendario.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final JwtUtils jwtUtils;
    private final AuthService authService;
    private final LoginRateLimiter rateLimiter;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${app.frontend.url:http://localhost:8081}")
    private String frontendUrl;

    @Autowired
    public AuthController(AuthenticationManager authenticationManager,
            UserRepository userRepository,
            CompanyRepository companyRepository,
            JwtUtils jwtUtils,
            AuthService authService,
            LoginRateLimiter rateLimiter,
            PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.jwtUtils = jwtUtils;
        this.authService = authService;
        this.rateLimiter = rateLimiter;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest,
            HttpServletRequest request) {
        String clientIp = getClientIp(request);

        // Rate limiting check
        if (!rateLimiter.isAllowed(clientIp)) {
            long remaining = rateLimiter.getBlockSecondsRemaining(clientIp);
            return ResponseEntity.status(429)
                    .body(new MessageResponse(
                            "Demasiados intentos de inicio de sesión. Intenta de nuevo en "
                                    + remaining + " segundos."));
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(),
                            loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            // Clear rate limit on successful login
            rateLimiter.recordSuccess(clientIp);

            return ResponseEntity.ok(new JwtResponse(jwt,
                    userDetails.getId(),
                    userDetails.getUsername(),
                    roles,
                    userDetails.getCompanyId(),
                    userDetails.getCompanyId() != null
                            ? companyRepository.findById(userDetails.getCompanyId()).get().getSubscriptionStatus()
                                    .toString()
                            : "FREE"));
        } catch (DisabledException e) {
            rateLimiter.recordFailedAttempt(clientIp);
            return ResponseEntity.status(401)
                    .body(new MessageResponse(
                            "Error: Cuenta inactiva. Active su cuenta usando el link generado."));
        } catch (BadCredentialsException e) {
            rateLimiter.recordFailedAttempt(clientIp);
            return ResponseEntity.status(401)
                    .body(new MessageResponse("Error: Usuario o contraseña incorrectos."));
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyUser(@RequestParam("code") String code) {
        User user = userRepository.findByVerificationCode(code)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid verification code!"));
        }

        user.setEnabled(true);
        user.setVerificationCode(null);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User verified successfully!"));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest signUpRequest) {
        try {
            User user = authService.registerUser(signUpRequest);
            if (!user.isEnabled()) {
                return ResponseEntity.ok(
                        new MessageResponse(
                                "Registro exitoso. Cuenta INACTIVA. Revisa 'backend/verification_links.txt' antes de iniciar sesión."));
            } else {
                return ResponseEntity.ok(new MessageResponse("Registro exitoso."));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String identifier = request.get("email"); // Can be email or username
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Debes proporcionar un email o nombre de usuario."));
        }

        // Try to find by email first, then by username
        User user = userRepository.findByEmail(identifier)
                .orElseGet(() -> userRepository.findByUsername(identifier).orElse(null));

        // Always return success to prevent user enumeration attacks
        if (user == null) {
            return ResponseEntity.ok(new MessageResponse(
                    "Si el email/usuario existe, recibirás instrucciones para restablecer tu contraseña."));
        }

        // Generate reset token (valid for 30 minutes)
        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(30));
        userRepository.save(user);

        // In production, send email. For now, write to file.
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        try {
            java.nio.file.Files.writeString(
                    java.nio.file.Path.of("password_reset_links.txt"),
                    "[" + LocalDateTime.now() + "] User: " + user.getUsername()
                            + " → " + resetLink + "\n",
                    java.nio.file.StandardOpenOption.CREATE,
                    java.nio.file.StandardOpenOption.APPEND);
        } catch (Exception e) {
            // Log but don't fail
            org.slf4j.LoggerFactory.getLogger(AuthController.class)
                    .error("Could not write reset link to file", e);
        }

        return ResponseEntity.ok(new MessageResponse(
                "Si el email/usuario existe, recibirás instrucciones para restablecer tu contraseña."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        if (token == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Token inválido o contraseña muy corta (mínimo 6 caracteres)."));
        }

        User user = userRepository.findByResetToken(token).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("El enlace de restablecimiento es inválido."));
        }

        if (user.getResetTokenExpiry() == null || LocalDateTime.now().isAfter(user.getResetTokenExpiry())) {
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepository.save(user);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(
                            "El enlace de restablecimiento ha expirado. Solicita uno nuevo."));
        }

        // Update password and clear token
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(
                new MessageResponse("Contraseña restablecida exitosamente. Ya puedes iniciar sesión."));
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
