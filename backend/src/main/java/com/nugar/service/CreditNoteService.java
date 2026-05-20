package com.nugar.service;

import com.nugar.domain.*;
import com.nugar.repository.*;
import com.nugar.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class CreditNoteService {

    @Autowired
    private CreditNoteRepository creditNoteRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public CreditNote createCreditNote(Long saleId, BigDecimal amount, String reason, CreditNote.CreditNoteType type, UserDetailsImpl userDetails) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (!sale.getCompany().getId().equals(userDetails.getCompanyId())) {
            throw new RuntimeException("Acceso denegado");
        }

        // Create the credit note
        CreditNote creditNote = new CreditNote();
        creditNote.setCompany(sale.getCompany());
        creditNote.setSale(sale);
        creditNote.setAmount(amount);
        creditNote.setReason(reason);
        creditNote.setType(type);

        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        creditNote.setCreatedBy(user);

        if (sale.getCustomer() != null) {
            creditNote.setCustomer(sale.getCustomer());
        }

        // Apply business logic based on type
        if (type == CreditNote.CreditNoteType.STORE_CREDIT) {
            if (sale.getCustomer() == null) {
                throw new RuntimeException("No se puede emitir saldo a favor si la venta no tiene un cliente asociado.");
            }
            Customer customer = sale.getCustomer();
            if (customer.getStoreCredit() == null) {
                customer.setStoreCredit(BigDecimal.ZERO);
            }
            customer.setStoreCredit(customer.getStoreCredit().add(amount));
            customerRepository.save(customer);
        } else {
            // It's a refund, so it affects the active shift
            Shift shift = shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN)
                    .orElseThrow(() -> new RuntimeException("No tienes un turno de caja abierto para registrar el egreso/reembolso."));
            
            switch (type) {
                case REFUND_TO_CASH:
                    shift.setRefundedCash(shift.getRefundedCash().add(amount));
                    break;
                case REFUND_TO_CARD:
                    shift.setRefundedCard(shift.getRefundedCard().add(amount));
                    break;
                case REFUND_TO_TRANSFER:
                    shift.setRefundedTransfer(shift.getRefundedTransfer().add(amount));
                    break;
                case REFUND_TO_MOBILE:
                    shift.setRefundedMobile(shift.getRefundedMobile().add(amount));
                    break;
            }
            shiftRepository.save(shift);
        }

        // Return items to stock
        // For simplicity, returning all items of the sale. In a more complex system, we'd pass specific items
        if (sale.getItems() != null) {
            for (SaleItem item : sale.getItems()) {
                Product product = item.getProduct();
                if (product != null) {
                    product.setStock(product.getStock() + item.getQuantity());
                    productRepository.save(product);
                }
            }
        }

        // Mark the sale as CANCELLED or PARTIALLY_REFUNDED (here we assume full cancellation for now)
        sale.setStatus(SaleStatus.CANCELLED);
        saleRepository.save(sale);

        return creditNoteRepository.save(creditNote);
    }

    public List<CreditNote> getCompanyCreditNotes(UserDetailsImpl userDetails) {
        return creditNoteRepository.findByCompanyIdOrderByDateDesc(userDetails.getCompanyId());
    }
}
