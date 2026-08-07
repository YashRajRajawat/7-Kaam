import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/custom_button.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  int _currentStep = 1;

  // Form Step 1 Controllers
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _cityController = TextEditingController();
  final TextEditingController _localityController = TextEditingController();
  String _selectedTrade = 'ELECTRICIAN';

  final List<String> _citySuggestions = [
    'Bangalore',
    'Mumbai',
    'Delhi',
    'Hyderabad',
    'Chennai',
  ];

  final List<Map<String, dynamic>> _tradeOptions = [
    {'trade': 'ELECTRICIAN', 'label': 'Electrician', 'icon': Icons.bolt},
    {'trade': 'PLUMBER', 'label': 'Plumber', 'icon': Icons.plumbing},
    {'trade': 'CARPENTER', 'label': 'Carpenter', 'icon': Icons.carpenter},
    {'trade': 'AC_TECHNICIAN', 'label': 'AC Technician', 'icon': Icons.ac_unit},
    {'trade': 'PAINTER', 'label': 'Painter', 'icon': Icons.format_paint},
    {'trade': 'WELDER', 'label': 'Welder', 'icon': Icons.handyman},
  ];

  // Form Step 2 Controllers
  final TextEditingController _aadhaarController = TextEditingController();
  File? _profileImage;
  final ImagePicker _picker = ImagePicker();

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _localityController.dispose();
    _aadhaarController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source, imageQuality: 70);
      if (picked != null) {
        setState(() {
          _profileImage = File(picked.path);
        });
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to pick image: $e')),
      );
    }
  }

  void _nextStep() {
    if (_currentStep == 1) {
      if (_nameController.text.trim().isEmpty ||
          _phoneController.text.trim().length < 10 ||
          _cityController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please fill Name, valid 10-digit Phone, and City'),
            backgroundColor: AppColors.errorRed,
          ),
        );
        return;
      }
      setState(() {
        _currentStep = 2;
      });
    } else if (_currentStep == 2) {
      if (_aadhaarController.text.replaceAll('-', '').length < 12) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a 12-digit Aadhaar number'),
            backgroundColor: AppColors.errorRed,
          ),
        );
        return;
      }
      setState(() {
        _currentStep = 3;
      });
    }
  }

  Future<void> _submitRegistration() async {
    final rawAadhaar = _aadhaarController.text.replaceAll('-', '').trim();
    final bytes = utf8.encode(rawAadhaar);
    final aadhaarHash = sha256.convert(bytes).toString();

    final registrationData = {
      'fullName': _nameController.text.trim(),
      'phoneNumber': '+91${_phoneController.text.trim()}',
      'trade': _selectedTrade,
      'city': _cityController.text.trim(),
      'locality': _localityController.text.trim().isNotEmpty ? _localityController.text.trim() : null,
      'aadhaarHash': aadhaarHash,
      // No endpoint exists yet for a worker to upload a photo file during
      // self-registration (only the admin-created-worker path handles
      // multipart upload) — omit rather than send a bogus local file path.
      // The picked photo (_profileImage) can be wired up once that upload
      // endpoint exists; profile photo can also be added later via Edit Profile.
      'profilePhotoUrl': null,
    };

    final success = await ref.read(authProvider.notifier).registerWorker(registrationData);

    if (success && mounted) {
      // Show Success Dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Icon(Icons.check_circle, color: AppColors.successGreen, size: 60),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Registration Successful!',
                style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Welcome to 7 Kaam. Let\'s get you certified now.',
                style: GoogleFonts.poppins(fontSize: 14, color: AppColors.grayText),
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            CustomButton(
              text: 'Go to Dashboard',
              onPressed: () {
                Navigator.of(ctx).pop();
                context.go('/home');
              },
            ),
          ],
        ),
      );
    } else if (mounted) {
      final errorMsg = ref.read(authProvider).errorMessage ?? 'Registration failed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMsg), backgroundColor: AppColors.errorRed),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'Worker Self-Registration',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress Indicator (Step X of 3)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              color: AppColors.white,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Step $_currentStep of 3',
                        style: GoogleFonts.poppins(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryTeal,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        _currentStep == 1
                            ? 'Personal Info'
                            : (_currentStep == 2 ? 'Identity' : 'Confirmation'),
                        style: GoogleFonts.poppins(
                          color: AppColors.grayText,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: _currentStep / 3.0,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryTeal),
                    minHeight: 6,
                  ),
                ],
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: _currentStep == 1
                    ? _buildStep1()
                    : (_currentStep == 2 ? _buildStep2() : _buildStep3()),
              ),
            ),

            // Navigation Buttons
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  if (_currentStep > 1) ...[
                    Expanded(
                      child: CustomButton(
                        text: 'Back',
                        isOutlined: true,
                        onPressed: () {
                          setState(() {
                            _currentStep--;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: CustomButton(
                      text: _currentStep == 3 ? 'Submit Registration' : 'Next Step',
                      isLoading: authState.status == AuthStatus.loading,
                      onPressed: _currentStep == 3 ? _submitRegistration : _nextStep,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Personal Details',
          style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.darkText),
        ),
        const SizedBox(height: 16),

        // Full Name
        _buildTextField(
          controller: _nameController,
          label: 'Full Name',
          icon: Icons.person,
          hint: 'e.g. Ramesh Kumar',
        ),
        const SizedBox(height: 16),

        // Phone Number
        _buildTextField(
          controller: _phoneController,
          label: 'Phone Number',
          icon: Icons.phone,
          hint: '10-digit mobile number',
          prefixText: '+91 ',
          keyboardType: TextInputType.phone,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
        ),
        const SizedBox(height: 16),

        // Trade Dropdown
        Text(
          'Trade / Skill',
          style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedTrade,
              isExpanded: true,
              items: _tradeOptions.map((t) {
                return DropdownMenuItem<String>(
                  value: t['trade'] as String,
                  child: Row(
                    children: [
                      Icon(t['icon'] as IconData, color: AppColors.primaryTeal, size: 20),
                      const SizedBox(width: 10),
                      Text(
                        t['label'] as String,
                        style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _selectedTrade = val;
                  });
                }
              },
            ),
          ),
        ),
        const SizedBox(height: 16),

        // City with Suggestions
        _buildTextField(
          controller: _cityController,
          label: 'City',
          icon: Icons.location_city,
          hint: 'Enter your city',
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: _citySuggestions.map((c) {
            return ChoiceChip(
              label: Text(c, style: GoogleFonts.poppins(fontSize: 12)),
              selected: _cityController.text == c,
              onSelected: (sel) {
                if (sel) {
                  setState(() {
                    _cityController.text = c;
                  });
                }
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 16),

        // Locality
        _buildTextField(
          controller: _localityController,
          label: 'Locality (Optional)',
          icon: Icons.map,
          hint: 'e.g. Indiranagar, Whitefield',
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Identity Verification',
          style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.darkText),
        ),
        const SizedBox(height: 16),

        // Aadhaar Number
        Text(
          'Aadhaar Number',
          style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: TextField(
            controller: _aadhaarController,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(12),
              _AadhaarFormatter(),
            ],
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.badge, color: AppColors.primaryTeal),
              hintText: 'XXXX-XXXX-XXXX',
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 14, horizontal: 12),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primaryTeal.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(Icons.security, color: AppColors.primaryTeal, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Your Aadhaar number is never stored. Only a secure hash is used for identity verification.',
                  style: GoogleFonts.poppins(fontSize: 11, color: AppColors.primaryTeal),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Profile Photo Upload
        Text(
          'Profile Photo',
          style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
        ),
        const SizedBox(height: 12),
        Center(
          child: Column(
            children: [
              CircleAvatar(
                radius: 50,
                backgroundColor: Colors.grey.shade200,
                backgroundImage: _profileImage != null ? FileImage(_profileImage!) : null,
                child: _profileImage == null
                    ? const Icon(Icons.person_add, size: 40, color: AppColors.primaryTeal)
                    : null,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt, size: 18),
                    label: Text('Camera', style: GoogleFonts.poppins(fontSize: 12)),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library, size: 18),
                    label: Text('Gallery', style: GoogleFonts.poppins(fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Confirm Details',
          style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.darkText),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade200),
            boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
          ),
          child: Column(
            children: [
              _buildSummaryRow('Full Name', _nameController.text),
              const Divider(),
              _buildSummaryRow('Phone', '+91 ${_phoneController.text}'),
              const Divider(),
              _buildSummaryRow('Trade', _selectedTrade),
              const Divider(),
              _buildSummaryRow('City', _cityController.text),
              if (_localityController.text.isNotEmpty) ...[
                const Divider(),
                _buildSummaryRow('Locality', _localityController.text),
              ],
              const Divider(),
              _buildSummaryRow('Aadhaar Status', 'Hash Ready (Secured)'),
              const Divider(),
              _buildSummaryRow(
                'Photo Upload',
                _profileImage != null ? 'Attached' : 'Not Provided',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required String hint,
    String? prefixText,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            inputFormatters: inputFormatters,
            decoration: InputDecoration(
              prefixIcon: Icon(icon, color: AppColors.primaryTeal),
              prefixText: prefixText,
              hintText: hint,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText)),
          Text(value, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.darkText)),
        ],
      ),
    );
  }
}

class _AadhaarFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var text = newValue.text.replaceAll('-', '');
    if (text.length > 12) text = text.substring(0, 12);

    var buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      var nonOnlyDigits = i + 1;
      if (nonOnlyDigits % 4 == 0 && nonOnlyDigits != text.length) {
        buffer.write('-');
      }
    }

    var string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}
