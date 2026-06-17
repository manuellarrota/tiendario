package com.nugar.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
public class S3StorageService {

    @Autowired
    private S3Client s3Client;

    @Value("${aws.s3.bucketName:tiendario-imagenes}")
    private String bucketName;

    @Value("${aws.s3.publicUrl:http://localhost:9000/tiendario-imagenes/}")
    private String publicUrlBase;

    public String storeFile(MultipartFile file) {
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = "";

        if (originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf(".")).toLowerCase();
        }

        // Security check: only allow safe image formats
        if (!extension.equals(".jpg") && !extension.equals(".jpeg") && !extension.equals(".png")
                && !extension.equals(".webp")) {
            throw new RuntimeException(
                    "Error: Formato de archivo inválido. Solo se admiten imágenes JPG, PNG o WEBP.");
        }

        // Create a unique file name to avoid collisions
        String fileName = UUID.randomUUID().toString() + extension;

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Return the full public URL
            String finalUrl = publicUrlBase;
            if (!finalUrl.endsWith("/")) {
                finalUrl += "/";
            }
            return finalUrl + fileName;

        } catch (IOException ex) {
            throw new RuntimeException("Could not read file for upload.", ex);
        } catch (Exception ex) {
            throw new RuntimeException("Could not upload file to S3. Please try again!", ex);
        }
    }
}
