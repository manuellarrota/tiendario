package com.tiendario;

import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.NotificationRepository;
import com.tiendario.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CompanyRepository companyRepository;

    private Company testCompany;
    private Notification testNotification;

    @BeforeEach
    void setUp() {
        // Create test company
        testCompany = new Company();
        testCompany.setName("Notification Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        // Create test notification
        testNotification = new Notification();
        testNotification.setMessage("Test notification message");
        testNotification.setCompany(testCompany);
        testNotification.setReadStatus(false);
        testNotification.setCreatedAt(LocalDateTime.now());
        testNotification = notificationRepository.save(testNotification);

        // Setup security context
        setupSecurityContext(testCompany.getId());
    }

    private void setupSecurityContext(Long companyId) {
        UserDetailsImpl userDetails = new UserDetailsImpl(1L, "manager", "password",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_MANAGER")),
                companyId, true);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void getNotifications_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].message", is("Test notification message")));
    }

    @Test
    void getUnreadCount_ShouldReturnCount() throws Exception {
        mockMvc.perform(get("/api/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(content().string(greaterThanOrEqualTo("1")));
    }

    @Test
    void markAsRead_ShouldSucceed() throws Exception {
        mockMvc.perform(put("/api/notifications/" + testNotification.getId() + "/read"))
                .andExpect(status().isOk());

        Notification updated = notificationRepository.findById(testNotification.getId()).orElse(null);
        assert updated != null;
        assert updated.isReadStatus();
    }

    @Test
    void markAsRead_ShouldSucceed_EvenWhenNotFound() throws Exception {
        // Should return OK even if notification doesn't exist
        mockMvc.perform(put("/api/notifications/99999/read"))
                .andExpect(status().isOk());
    }
}
