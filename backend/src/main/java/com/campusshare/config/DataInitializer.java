package com.campusshare.config;
import com.campusshare.domain.*;
import com.campusshare.domain.Enums.*;
import com.campusshare.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Set;
@Configuration
public class DataInitializer {
 @Bean CommandLineRunner seed(UserRepository users,CategoryRepository categories,PasswordEncoder encoder,@Value("${app.admin.email}")String email,@Value("${app.admin.password}")String password){return args->{
  if(!users.existsByEmail(email)){User u=new User();u.setName("Platform Admin");u.setEmail(email);u.setPassword(encoder.encode(password));u.setCollegeRollNumber("ADMIN");u.setRoles(Set.of(Enums.Role.ADMIN));u.setVerificationStatus(VerificationStatus.APPROVED);users.save(u);}
  for(String name:new String[]{"Books","Lab Kits","Calculators","Electronics","Project Components","Other"})if(categories.findAll().stream().noneMatch(c->c.getName().equals(name))){Category c=new Category();c.setName(name);categories.save(c);}
 };}
}
