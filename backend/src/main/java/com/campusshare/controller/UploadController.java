package com.campusshare.controller;
import com.campusshare.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
@RestController @RequestMapping("/api/uploads") @RequiredArgsConstructor
public class UploadController {
 private final StorageService storage;
 @PostMapping public Map<String,String> upload(@RequestParam MultipartFile file,@RequestParam(defaultValue="campus-share")String folder){return Map.of("url",storage.upload(file,folder));}
}
