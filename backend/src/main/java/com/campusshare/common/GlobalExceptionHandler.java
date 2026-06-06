package com.campusshare.common;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;
@RestControllerAdvice
public class GlobalExceptionHandler {
 @ExceptionHandler(ResourceNotFoundException.class) ResponseEntity<?> notFound(RuntimeException e){return error(HttpStatus.NOT_FOUND,e.getMessage());}
 @ExceptionHandler({BadRequestException.class,IllegalArgumentException.class}) ResponseEntity<?> bad(RuntimeException e){return error(HttpStatus.BAD_REQUEST,e.getMessage());}
 @ExceptionHandler({BadCredentialsException.class,DisabledException.class}) ResponseEntity<?> authentication(RuntimeException e){return error(HttpStatus.UNAUTHORIZED,"Invalid email or password");}
 @ExceptionHandler(TokenRefreshException.class) ResponseEntity<?> refresh(TokenRefreshException e){return error(HttpStatus.UNAUTHORIZED,e.getMessage());}
 @ExceptionHandler(AccessDeniedException.class) ResponseEntity<?> denied(AccessDeniedException e){return error(HttpStatus.FORBIDDEN,"You do not have permission to access this resource");}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> validation(MethodArgumentNotValidException e){Map<String,String> fields=new HashMap<>();e.getBindingResult().getFieldErrors().forEach(x->fields.put(x.getField(),x.getDefaultMessage()));return ResponseEntity.badRequest().body(Map.of("timestamp",Instant.now(),"message","Validation failed","fields",fields));}
 @ExceptionHandler(Exception.class) ResponseEntity<?> other(Exception e){return error(HttpStatus.INTERNAL_SERVER_ERROR,"Unexpected server error");}
 private ResponseEntity<?> error(HttpStatus status,String message){return ResponseEntity.status(status).body(Map.of("timestamp",Instant.now(),"status",status.value(),"message",message));}
}
