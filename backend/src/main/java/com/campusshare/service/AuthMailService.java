package com.campusshare.service;

import com.campusshare.domain.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthMailService {
    private static final Logger log = LoggerFactory.getLogger(AuthMailService.class);

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.port:587}")
    private int mailPort;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @PostConstruct
    void logMailConfiguration() {
        log.info(
                "event=auth_mail_config host={} port={} username_present={} password_present={} from={}",
                mailHost,
                mailPort,
                !mailUsername.isBlank(),
                !mailPassword.isBlank(),
                fromAddress
        );
    }

    public boolean sendVerificationEmail(User user, String verificationUrl) {
        return sendEmail(user, "Verify your email address", "auth/verify-email", Map.of(
                "name", user.getName(),
                "actionUrl", verificationUrl,
                "supportEmail", fromAddress
        ), "verification");
    }

    public boolean sendPasswordResetEmail(User user, String resetUrl) {
        return sendEmail(user, "Reset your password", "auth/reset-password", Map.of(
                "name", user.getName(),
                "actionUrl", resetUrl,
                "supportEmail", fromAddress
        ), "password_reset");
    }

    private boolean sendEmail(User user, String subject, String template, Map<String, Object> variables, String eventType) {
        try {
            Context context = new Context(Locale.ENGLISH);
            variables.forEach(context::setVariable);
            String html = templateEngine.process(template, context);

            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setTo(user.getEmail());
            helper.setFrom(fromAddress);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("event=auth_email_sent type={} user_id={}", eventType, user.getId());
            return true;
        } catch (MailException ex) {
            Throwable rootCause = rootCause(ex);
            log.error(
                    "event=auth_email_send_failed type={} user_id={} smtp_exception_class={} smtp_exception_message={}",
                    eventType,
                    user.getId(),
                    rootCause.getClass().getSimpleName(),
                    rootCause.getMessage(),
                    ex
            );
            return false;
        } catch (Exception ex) {
            log.error("event=auth_email_send_failed type={} user_id={} reason={}",
                    eventType, user.getId(), ex.getClass().getSimpleName(), ex);
            return false;
        }
    }

    private static Throwable rootCause(Throwable ex) {
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }
}
