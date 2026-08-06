import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../models/work_history_model.dart';
import '../../providers/worker_provider.dart';
import '../../widgets/custom_button.dart';

class WorkHistoryScreen extends ConsumerStatefulWidget {
  const WorkHistoryScreen({super.key});

  @override
  ConsumerState<WorkHistoryScreen> createState() => _WorkHistoryScreenState();
}

class _WorkHistoryScreenState extends ConsumerState<WorkHistoryScreen> {
  @override
  Widget build(BuildContext context) {
    final workerState = ref.watch(workerProvider);
    final worker = workerState.worker;
    final histories = worker?.workHistory ?? [];

    // Compute portfolio stats
    int totalMonths = 0;
    final cities = <String>{};
    final trades = <String>{};

    for (final h in histories) {
      totalMonths += h.durationMonths > 0 ? h.durationMonths : 6;
      if (h.clientCity.isNotEmpty) cities.add(h.clientCity);
      if (h.trade.isNotEmpty) trades.add(h.trade);
    }
    final totalYears = (totalMonths / 12).toStringAsFixed(1);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryTeal,
        title: Text(
          'Work Portfolio & History',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Colors.white),
            onPressed: () => _showAddExperienceModal(context),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddExperienceModal(context),
        backgroundColor: AppColors.primaryTeal,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text(
          'Add Project',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primaryTeal, AppColors.navy],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: AppColors.primaryTeal.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildStatBox('$totalYears Yrs', 'Experience'),
                        Container(width: 1, height: 40, color: Colors.white24),
                        _buildStatBox('${histories.length}', 'Projects'),
                        Container(width: 1, height: 40, color: Colors.white24),
                        _buildStatBox('${cities.isEmpty ? 1 : cities.length}', 'Cities'),
                      ],
                    ),
                    if (trades.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      const Divider(color: Colors.white24, height: 1),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: trades.map((t) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.18),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.white30),
                            ),
                            child: Text(
                              t,
                              style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Career Timeline',
                    style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.navy),
                  ),
                  Text(
                    '${histories.length} entries',
                    style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              if (histories.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.work_history_outlined, size: 56, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      Text(
                        'No Work Portfolio Entries Yet',
                        style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.navy),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Add your past projects and clients to build your professional portfolio and increase your KaamCard score.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 16),
                      CustomButton(
                        text: 'Add First Project',
                        onPressed: () => _showAddExperienceModal(context),
                      ),
                    ],
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: histories.length,
                  itemBuilder: (context, index) {
                    final isLast = index == histories.length - 1;
                    return _buildTimelineTile(histories[index], isLast);
                  },
                ),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatBox(String val, String label) {
    return Column(
      children: [
        Text(val, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.gold)),
        const SizedBox(height: 2),
        Text(label, style: GoogleFonts.poppins(fontSize: 11, color: Colors.white70)),
      ],
    );
  }

  Widget _buildTimelineTile(WorkHistoryModel item, bool isLast) {
    final clientTypeEmoji = _getClientTypeEmoji(item.clientType);
    final scaleColor = _getScaleColor(item.projectScale);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline indicator line + dot
          SizedBox(
            width: 32,
            child: Column(
              children: [
                Container(
                  width: 14,
                  height: 14,
                  margin: const EdgeInsets.only(top: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryTeal,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(color: AppColors.primaryTeal.withOpacity(0.4), blurRadius: 4, offset: const Offset(0, 2)),
                    ],
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: AppColors.primaryTeal.withOpacity(0.3),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Content Card
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Text(clientTypeEmoji, style: const TextStyle(fontSize: 14)),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                item.clientName,
                                style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.navy),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (item.isVerified) ...[
                              const SizedBox(width: 6),
                              const Icon(Icons.verified, size: 16, color: AppColors.primaryTeal),
                            ],
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: scaleColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: scaleColor.withOpacity(0.3)),
                        ),
                        child: Text(
                          item.projectScale,
                          style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.bold, color: scaleColor),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.projectTitle,
                    style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryTeal),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.projectDescription,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade700, height: 1.4),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          item.trade,
                          style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.navy),
                        ),
                      ),
                      Text(
                        item.endDate == null ? 'Currently working here' : '${item.durationMonths} mos · ${item.startDate}',
                        style: GoogleFonts.poppins(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getClientTypeEmoji(String type) {
    switch (type.toUpperCase()) {
      case 'HOUSEHOLD':
        return '🏠';
      case 'SHOP':
        return '🏪';
      case 'COMPANY':
        return '🏢';
      case 'CONTRACTOR':
        return '🔨';
      default:
        return '💼';
    }
  }

  Color _getScaleColor(String scale) {
    switch (scale.toUpperCase()) {
      case 'SMALL':
        return AppColors.infoBlue;
      case 'MEDIUM':
        return AppColors.gold;
      case 'LARGE':
        return AppColors.primaryTeal;
      default:
        return Colors.grey;
    }
  }

  void _showAddExperienceModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const AddWorkHistorySheet(),
    );
  }
}

class AddWorkHistorySheet extends ConsumerStatefulWidget {
  const AddWorkHistorySheet({super.key});

  @override
  ConsumerState<AddWorkHistorySheet> createState() => _AddWorkHistorySheetState();
}

class _AddWorkHistorySheetState extends ConsumerState<AddWorkHistorySheet> {
  final _formKey = GlobalKey<FormState>();
  final _clientNameController = TextEditingController();
  final _clientCityController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _projectTitleController = TextEditingController();
  final _projectDescController = TextEditingController();

  String _clientType = 'HOUSEHOLD';
  String _selectedTrade = 'ELECTRICIAN';
  String _projectScale = 'SMALL';

  DateTime _startDate = DateTime.now().subtract(const Duration(days: 180));
  DateTime? _endDate;
  bool _currentlyWorking = false;

  @override
  void initState() {
    super.initState();
    final worker = ref.read(workerProvider).worker;
    if (worker != null) {
      _selectedTrade = worker.trade.isNotEmpty ? worker.trade : 'ELECTRICIAN';
      _clientCityController.text = worker.city;
    }
  }

  @override
  void dispose() {
    _clientNameController.dispose();
    _clientCityController.dispose();
    _clientPhoneController.dispose();
    _projectTitleController.dispose();
    _projectDescController.dispose();
    super.dispose();
  }

  int get _calculatedDurationMonths {
    final end = _currentlyWorking ? DateTime.now() : (_endDate ?? DateTime.now());
    final diffDays = end.difference(_startDate).inDays;
    return (diffDays / 30.4375).round().clamp(1, 600);
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _startDate = picked;
        if (_endDate != null && _endDate!.isBefore(_startDate)) {
          _endDate = null;
        }
      });
    }
  }

  Future<void> _pickEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? DateTime.now(),
      firstDate: _startDate,
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _endDate = picked;
        _currentlyWorking = false;
      });
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    if (_projectDescController.text.trim().length < 30) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Project description must be at least 30 characters long.'),
          backgroundColor: AppColors.errorRed,
        ),
      );
      return;
    }

    final entry = WorkHistoryModel(
      clientName: _clientNameController.text.trim(),
      clientType: _clientType,
      clientPhone: _clientPhoneController.text.trim().isNotEmpty ? _clientPhoneController.text.trim() : null,
      clientCity: _clientCityController.text.trim(),
      projectTitle: _projectTitleController.text.trim(),
      projectDescription: _projectDescController.text.trim(),
      trade: _selectedTrade,
      startDate: DateFormat('MMM yyyy').format(_startDate),
      endDate: _currentlyWorking || _endDate == null ? null : DateFormat('MMM yyyy').format(_endDate!),
      durationMonths: _calculatedDurationMonths,
      projectScale: _projectScale,
      isVerified: false,
    );

    final success = await ref.read(workerProvider.notifier).addWorkHistory(entry);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Portfolio project added successfully! Score updated.'),
          backgroundColor: AppColors.successGreen,
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(workerProvider).isLoading;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Add Portfolio Project',
                style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.navy),
              ),
              const SizedBox(height: 16),

              // Section 1: Client Details
              _buildSectionHeader('Section 1 — Client Details'),
              const SizedBox(height: 10),
              TextFormField(
                controller: _clientNameController,
                decoration: _inputDecoration('Client / Company / Shop Name', Icons.business),
                validator: (val) => val == null || val.trim().isEmpty ? 'Enter client or company name' : null,
              ),
              const SizedBox(height: 12),

              Text('Client Type', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.darkText)),
              const SizedBox(height: 6),
              Row(
                children: [
                  _buildTypeChip('HOUSEHOLD', '🏠 Household'),
                  const SizedBox(width: 6),
                  _buildTypeChip('SHOP', '🏪 Shop'),
                  const SizedBox(width: 6),
                  _buildTypeChip('COMPANY', '🏢 Company'),
                  const SizedBox(width: 6),
                  _buildTypeChip('CONTRACTOR', '🔨 Contractor'),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _clientCityController,
                      decoration: _inputDecoration('Client City', Icons.location_city),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Enter city' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _clientPhoneController,
                      keyboardType: TextInputType.phone,
                      decoration: _inputDecoration('Phone (Optional)', Icons.phone),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),
              // Section 2: Project Details
              _buildSectionHeader('Section 2 — Project Details'),
              const SizedBox(height: 10),
              TextFormField(
                controller: _projectTitleController,
                decoration: _inputDecoration('Project Title (e.g. Full House Wiring — 3BHK)', Icons.work_outline),
                validator: (val) => val == null || val.trim().isEmpty ? 'Enter project title' : null,
              ),
              const SizedBox(height: 12),

              Text('Trade', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.darkText)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedTrade,
                decoration: _inputDecoration('Trade', Icons.build),
                items: ['ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER']
                    .map((t) => DropdownMenuItem(value: t, child: Text(t, style: GoogleFonts.poppins(fontSize: 13))))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedTrade = val);
                },
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _projectDescController,
                maxLines: 3,
                decoration: _inputDecoration('Project Description (Min 30 chars)', Icons.notes),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Enter project description';
                  if (val.trim().length < 30) return 'Must be at least 30 characters';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              Text('Project Scale', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.darkText)),
              const SizedBox(height: 6),
              Row(
                children: [
                  _buildScaleChip('SMALL', 'Small (Single room/task)'),
                  const SizedBox(width: 8),
                  _buildScaleChip('MEDIUM', 'Medium (Full house)'),
                  const SizedBox(width: 8),
                  _buildScaleChip('LARGE', 'Large (Commercial)'),
                ],
              ),

              const SizedBox(height: 20),
              // Section 3: Duration
              _buildSectionHeader('Section 3 — Duration'),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _pickStartDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Start Date', style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
                            const SizedBox(height: 2),
                            Text(DateFormat('MMM yyyy').format(_startDate), style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: _currentlyWorking ? null : _pickEndDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: _currentlyWorking ? Colors.grey.shade100 : AppColors.background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('End Date', style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey.shade600)),
                            const SizedBox(height: 2),
                            Text(
                              _currentlyWorking ? 'Present' : (_endDate != null ? DateFormat('MMM yyyy').format(_endDate!) : 'Select'),
                              style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              Row(
                children: [
                  Checkbox(
                    value: _currentlyWorking,
                    activeColor: AppColors.primaryTeal,
                    onChanged: (val) {
                      setState(() {
                        _currentlyWorking = val ?? false;
                        if (_currentlyWorking) _endDate = null;
                      });
                    },
                  ),
                  Text('Currently working here', style: GoogleFonts.poppins(fontSize: 12, color: AppColors.darkText)),
                  const Spacer(),
                  Text(
                    'Duration: $_calculatedDurationMonths mos',
                    style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryTeal),
                  ),
                ],
              ),

              const SizedBox(height: 24),
              CustomButton(
                text: 'Save Project Entry',
                isLoading: isLoading,
                onPressed: _submitForm,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primaryTeal.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        title,
        style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryTeal),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: GoogleFonts.poppins(fontSize: 12),
      prefixIcon: Icon(icon, size: 20, color: AppColors.primaryTeal),
      filled: true,
      fillColor: AppColors.background,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
    );
  }

  Widget _buildTypeChip(String type, String label) {
    final selected = _clientType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _clientType = type),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryTeal : AppColors.background,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: selected ? AppColors.primaryTeal : Colors.grey.shade300),
          ),
          child: Text(
            label,
            style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w600, color: selected ? Colors.white : AppColors.darkText),
          ),
        ),
      ),
    );
  }

  Widget _buildScaleChip(String scale, String label) {
    final selected = _projectScale == scale;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _projectScale = scale),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.navy : AppColors.background,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: selected ? AppColors.navy : Colors.grey.shade300),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w600, color: selected ? Colors.white : AppColors.darkText),
          ),
        ),
      ),
    );
  }
}
