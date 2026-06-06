package com.campusshare.service.impl;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.campusshare.common.BadRequestException;
import com.campusshare.dto.StorageUploadResult;
import com.campusshare.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
@Service @RequiredArgsConstructor
public class CloudinaryStorageService implements StorageService {
 private final Cloudinary cloudinary;
 public String upload(MultipartFile file,String folder){return upload(file, folder, "auto").url();}
 public StorageUploadResult upload(MultipartFile file,String folder,String resourceType){try{Map<?,?> result=cloudinary.uploader().upload(file.getBytes(),ObjectUtils.asMap("folder",folder,"resource_type",resourceType));Object format=result.get("format");return new StorageUploadResult(result.get("secure_url").toString(),result.get("public_id").toString(),String.valueOf(result.get("resource_type")),toLong(result.get("bytes")),String.valueOf(format==null?"":format));}catch(Exception e){throw new BadRequestException("File upload failed");}}
 private long toLong(Object value){return value instanceof Number number?number.longValue():0L;}
}
