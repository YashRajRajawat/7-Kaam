import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/discovery_provider.dart';
import '../../widgets/worker_card_skeleton.dart';
import 'map_view.dart';
import 'worker_card.dart';

class DiscoverScreen extends ConsumerStatefulWidget {
  const DiscoverScreen({super.key});

  @override
  ConsumerState<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends ConsumerState<DiscoverScreen> {
  final TextEditingController _searchController = TextEditingController();

  final List<String> _trades = [
    'All',
    'Electrician',
    'Plumber',
    'Carpenter',
    'AC Technician',
    'Painter',
    'Welder',
  ];

  final List<String> _tiers = ['Any', 'SILVER+', 'GOLD+', 'EXPERT'];
  final List<String> _sortOptions = ['Best Score', 'Nearest', 'Most Reviews'];

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(discoveryStateNotifierProvider);
    final notifier = ref.read(discoveryProvider.notifier);
    final filteredWorkers = state.filteredWorkers;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Sticky Top Header Container
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Row 1: City & View Toggle
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on, color: AppColors.primaryTeal, size: 22),
                          const SizedBox(width: 4),
                          DropdownButton<String>(
                            value: state.selectedCity,
                            underline: const SizedBox(),
                            icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.navy),
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.navy,
                            ),
                            items: ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai']
                                .map((city) => DropdownMenuItem(
                                      value: city,
                                      child: Text(city),
                                    ))
                                .toList(),
                            onChanged: (city) {
                              if (city != null) {
                                notifier.setCity(city);
                              }
                            },
                          ),
                        ],
                      ),

                      // List / Map Toggle Button (Airbnb style)
                      InkWell(
                        onTap: () {
                          notifier.toggleMapView();
                        },
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.navy.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.navy.withOpacity(0.2)),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                state.isMapView ? Icons.list_rounded : Icons.map_outlined,
                                color: AppColors.navy,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                state.isMapView ? 'List View' : 'Map View',
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.navy,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Search Bar
                  TextField(
                    controller: _searchController,
                    onChanged: (query) {
                      notifier.setSearchQuery(query);
                    },
                    decoration: InputDecoration(
                      hintText: 'Search electricians, plumbers...',
                      hintStyle: GoogleFonts.poppins(fontSize: 14, color: AppColors.grayText),
                      prefixIcon: const Icon(Icons.search, color: AppColors.primaryTeal),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                notifier.setSearchQuery('');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: AppColors.background,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.borderGray),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.borderGray),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Trade Filter Chips (Horizontal Scroll)
                  SizedBox(
                    height: 34,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _trades.length,
                      itemBuilder: (context, index) {
                        final trade = _trades[index];
                        final isSelected = state.selectedTrade == trade;

                        return Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: ChoiceChip(
                            label: Text(trade),
                            selected: isSelected,
                            selectedColor: AppColors.primaryTeal,
                            backgroundColor: Colors.white,
                            labelStyle: GoogleFonts.poppins(
                              color: isSelected ? Colors.white : AppColors.darkText,
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(
                                color: isSelected ? AppColors.primaryTeal : AppColors.borderGray,
                              ),
                            ),
                            onSelected: (selected) {
                              if (selected) {
                                notifier.setTrade(trade);
                              }
                            },
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Secondary Filter Row: Tier & Sort
                  Row(
                    children: [
                      Text(
                        'Tier: ',
                        style: GoogleFonts.poppins(fontSize: 12, color: AppColors.grayText),
                      ),
                      DropdownButton<String>(
                        value: state.selectedTier,
                        underline: const SizedBox(),
                        style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy),
                        items: _tiers
                            .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                            .toList(),
                        onChanged: (tier) {
                          if (tier != null) notifier.setTier(tier);
                        },
                      ),
                      const Spacer(),
                      Text(
                        'Sort: ',
                        style: GoogleFonts.poppins(fontSize: 12, color: AppColors.grayText),
                      ),
                      DropdownButton<String>(
                        value: state.sortBy,
                        underline: const SizedBox(),
                        style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy),
                        items: _sortOptions
                            .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                            .toList(),
                        onChanged: (sort) {
                          if (sort != null) notifier.setSortBy(sort);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Main View Content (List View vs Map View)
            Expanded(
              child: state.isMapView
                  ? const DiscoverMapView()
                  : RefreshIndicator(
                      onRefresh: () => notifier.fetchWorkers(),
                      color: AppColors.primaryTeal,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          // Results Header Count
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12.0),
                            child: Text(
                              '${filteredWorkers.length} verified workers in ${state.selectedCity}',
                              style: GoogleFonts.poppins(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.grayText,
                              ),
                            ),
                          ),

                          if (state.isLoading)
                            ...List.generate(3, (index) => const WorkerCardSkeleton())
                          else if (filteredWorkers.isEmpty)
                            Padding(
                              padding: const EdgeInsets.all(40.0),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.search_off_rounded, size: 64, color: AppColors.grayText),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No verified workers found',
                                    style: GoogleFonts.poppins(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.navy,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Try adjusting your search query or trade/tier filters',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(fontSize: 13, color: AppColors.grayText),
                                  ),
                                ],
                              ),
                            )
                          else
                            ...filteredWorkers.map((worker) => WorkerCard(worker: worker)).toList(),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

final discoveryStateNotifierProvider = StateNotifierProvider<DiscoveryNotifier, DiscoveryState>((ref) {
  return ref.watch(discoveryProvider.notifier);
});
