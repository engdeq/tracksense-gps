import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

abstract final class AppTheme {
  static ThemeData get light {
    final base = ColorScheme.light(
      primary: AppColors.royalPurple,
      onPrimary: Colors.white,
      secondary: AppColors.teal,
      onSecondary: Colors.white,
      surface: Colors.white,
      onSurface: AppColors.textPrimary,
      error: AppColors.error,
      outline: const Color(0xFFE8E7F0),
    );
    return _build(base, Brightness.light);
  }

  static ThemeData get dark {
    final base = ColorScheme.dark(
      primary: AppColors.royalPurple,
      onPrimary: Colors.white,
      secondary: AppColors.teal,
      onSecondary: AppColors.deepPurple,
      surface: const Color(0xFF1F1635),
      onSurface: const Color(0xFFF3F2F8),
      error: AppColors.error,
      outline: const Color(0xFF3D3458),
      surfaceContainerHighest: const Color(0xFF2A2140),
    );
    return _build(base, Brightness.dark);
  }

  static ThemeData _build(ColorScheme scheme, Brightness brightness) {
    final textTheme = GoogleFonts.dmSansTextTheme(
      ThemeData(brightness: brightness).textTheme,
    ).copyWith(
      bodyLarge: GoogleFonts.dmSans(color: brightness == Brightness.light ? AppColors.textPrimary : scheme.onSurface),
      bodyMedium: GoogleFonts.dmSans(color: brightness == Brightness.light ? AppColors.textSecondary : const Color(0xFFB8B5C8)),
      titleLarge: GoogleFonts.dmSans(fontWeight: FontWeight.w700),
      titleMedium: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor:
          brightness == Brightness.light ? AppColors.lightBg : AppColors.deepPurple,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: brightness == Brightness.light ? AppColors.lightBg : AppColors.deepPurple,
        foregroundColor: brightness == Brightness.light ? AppColors.textPrimary : Colors.white,
        titleTextStyle: textTheme.titleLarge?.copyWith(fontSize: 20),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: brightness == Brightness.light ? Colors.white : scheme.surface,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: brightness == Brightness.light ? Colors.white : scheme.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.royalPurple, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          backgroundColor: AppColors.royalPurple,
          foregroundColor: Colors.white,
          textStyle: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: brightness == Brightness.light ? Colors.white : const Color(0xFF1A1230),
        selectedItemColor: AppColors.royalPurple,
        unselectedItemColor: AppColors.textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 12,
      ),
      dividerTheme: DividerThemeData(color: scheme.outline.withValues(alpha: 0.6)),
    );
  }
}