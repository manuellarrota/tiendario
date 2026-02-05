package com.tiendario;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import com.tiendario.repository.search.ProductSearchRepository;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableJpaRepositories(basePackages = "com.tiendario.repository", excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, value = ProductSearchRepository.class))
public class TiendarioApplication {

	public static void main(String[] args) {
		SpringApplication.run(TiendarioApplication.class, args);
	}

}
