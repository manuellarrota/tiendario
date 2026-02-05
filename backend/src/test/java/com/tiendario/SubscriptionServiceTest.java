package com.tiendario;

import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SubscriptionPaymentRepository;
import com.tiendario.service.SubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class SubscriptionServiceTest {

    @Autowired
    private SubscriptionService subscriptionService;

    @Autowired
    private SubscriptionPaymentRepository paymentRepository;

    @Autowired
    private CompanyRepository companyRepository;

    private Company testCompany;
    private SubscriptionPayment testPayment;

    @BeforeEach
    void setUp() {
        testCompany = new Company();
        testCompany.setName("Test Subscription Company");
        testCompany.setSubscriptionStatus(SubscriptionStatus.FREE);
        testCompany = companyRepository.save(testCompany);

        testPayment = new SubscriptionPayment();
        testPayment.setCompany(testCompany);
        testPayment.setAmount(new BigDecimal("15.00"));
        testPayment.setPaymentMethod("Zelle");
        testPayment.setReference("TXN12345");
        testPayment.setStatus(PaymentStatus.PENDING);
        testPayment = paymentRepository.save(testPayment);
    }

    @Test
    void approvePayment_ShouldUpgradeCompanyAndExtendTime() {
        // Arrange
        Long paymentId = testPayment.getId();

        // Act
        subscriptionService.approvePayment(paymentId);

        // Assert
        SubscriptionPayment approvedPayment = paymentRepository.findById(paymentId).get();
        assertEquals(PaymentStatus.APPROVED, approvedPayment.getStatus());

        Company updatedCompany = companyRepository.findById(testCompany.getId()).get();
        assertEquals(SubscriptionStatus.PAID, updatedCompany.getSubscriptionStatus());
        assertNotNull(updatedCompany.getSubscriptionEndDate());
        assertTrue(updatedCompany.getSubscriptionEndDate().isAfter(LocalDateTime.now()));
    }

    @Test
    void rejectPayment_ShouldSetStatusToRejected() {
        // Arrange
        Long paymentId = testPayment.getId();
        String reason = "Monto incorrecto";

        // Act
        subscriptionService.rejectPayment(paymentId, reason);

        // Assert
        SubscriptionPayment rejectedPayment = paymentRepository.findById(paymentId).get();
        assertEquals(PaymentStatus.REJECTED, rejectedPayment.getStatus());
        assertEquals(reason, rejectedPayment.getNotes());

        Company updatedCompany = companyRepository.findById(testCompany.getId()).get();
        assertEquals(SubscriptionStatus.FREE, updatedCompany.getSubscriptionStatus());
    }

    @Test
    void approvePayment_ShouldAccumulateTimeIfAlreadyPaid() {
        // Arrange
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        LocalDateTime futureDate = LocalDateTime.now().plusDays(10);
        testCompany.setSubscriptionEndDate(futureDate);
        companyRepository.save(testCompany);

        // Act
        subscriptionService.approvePayment(testPayment.getId());

        // Assert
        Company updatedCompany = companyRepository.findById(testCompany.getId()).get();
        // Should be approximately futureDate + 30 days
        assertTrue(updatedCompany.getSubscriptionEndDate().isAfter(futureDate.plusDays(29)));
        assertTrue(updatedCompany.getSubscriptionEndDate().isBefore(futureDate.plusDays(31)));
    }
}
