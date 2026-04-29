package com.tiendario.util;

import java.text.Normalizer;

public class SearchUtils {
    
    /**
     * Normalizes a search string by trimming, lowercasing, and removing diacritics (accents).
     * @param input The raw search string
     * @return The normalized string
     */
    public static String normalize(String input) {
        if (input == null) {
            return "";
        }
        String normalized = Normalizer.normalize(input.trim().toLowerCase(), Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }
}
