package com.campusshare.service;
import com.campusshare.dto.StorageUploadResult;
import org.springframework.web.multipart.MultipartFile;
public interface StorageService {
    String upload(MultipartFile file,String folder);
    StorageUploadResult upload(MultipartFile file, String folder, String resourceType);
}
