import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../models/booking_model.dart';
import '../../widgets/custom_button.dart';

class BookingConfirmScreen extends StatelessWidget {
  final BookingModel? booking;

  const BookingConfirmScreen({
    super.key,
    this.booking,
  });

  @override
  Widget build(BuildContext context) {
    final b = booking;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Green Checkmark Animation Container
              Container(
                width: 100,
                height: 100,
                decoration: const BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  color: Colors.white,
                  size: 64,
                ),
              )
                  .animate()
                  .scale(duration: 500.ms, curve: Curves.elasticOut)
                  .fadeIn(duration: 400.ms),

              const SizedBox(height: 24),
              Text(
                'Booking Confirmed!',
                style: GoogleFonts.poppins(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.navy,
                ),
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 8),
              Text(
                'Your service request has been sent to the worker.',
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color: AppColors.grayText,
                ),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 32),

              // Booking Details Card
              if (b != null)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Booking ID',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              color: AppColors.grayText,
                            ),
                          ),
                          Text(
                            b.id,
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppColors.navy,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 24, color: AppColors.borderGray),
                      _buildRow('Worker Name', b.workerName),
                      _buildRow('Trade', b.workerTrade),
                      _buildRow('Date & Time', '${b.serviceDate} at ${b.serviceTime}'),
                      _buildRow('Service Address', b.serviceAddress, isMultiLine: true),
                      _buildRow('Price Estimate', b.priceEstimate),
                    ],
                  ),
                ).animate().slideY(begin: 0.2, end: 0, delay: 400.ms).fadeIn(),

              const Spacer(),

              // Action Buttons
              CustomButton(
                text: 'View My Bookings',
                onPressed: () {
                  context.go('/home', extra: 1); // Select tab 1 (Bookings)
                },
              ),
              const SizedBox(height: 12),
              CustomButton(
                text: 'Back to Discover',
                isOutlined: true,
                onPressed: () {
                  context.go('/home');
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value, {bool isMultiLine = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: isMultiLine ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: AppColors.darkText,
              ),
              maxLines: isMultiLine ? 2 : 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
