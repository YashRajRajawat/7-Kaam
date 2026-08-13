import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/discovery_provider.dart';
import '../../widgets/unclaimed_badge.dart';
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
  final List<String> _sortOptions = ['Best Score', 'Nearest', 'Newest'];

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(discoveryProvider);
    final notifier = ref.read(discoveryProvider.notifier);
    final filteredWorkers = state.filteredWorkers;
    final unclaimedCount = filteredWorkers.where((w) => w.isUnclaimed).length;
    final verifiedCount = filteredWorkers.length - unclaimedCount;

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
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Row 1: Location (GPS chip or city dropdown) & View Toggle
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: state.useGps
                            ? InkWell(
                                onTap: notifier.useCitySelection,
                                borderRadius: BorderRadius.circular(20),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.my_location_rounded, color: AppColors.primaryTeal, size: 20),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Workers near you',
                                      style: GoogleFonts.poppins(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.navy,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.edit_location_alt_outlined, size: 16, color: AppColors.grayText),
                                  ],
                                ),
                              )
                            : Row(
                                mainAxisSize: MainAxisSize.min,
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
                                  const SizedBox(width: 6),
                                  InkWell(
                                    onTap: notifier.useMyLocation,
                                    child: const Icon(Icons.my_location_outlined, size: 18, color: AppColors.grayText),
                                  ),
                                ],
                              ),
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
                            color: AppColors.navy.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.navy.withValues(alpha: 0.2)),
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

                  // 'Verified only' — the one filter that removes every
                  // unclaimed public-directory listing. Given its own row so
                  // it cannot be squeezed out of the layout on a narrow phone.
                  Align(
                    alignment: Alignment.centerLeft,
                    child: FilterChip(
                      label: Text(UnclaimedCopy.filterChip),
                      selected: state.verifiedOnly,
                      onSelected: (_) => notifier.toggleVerifiedOnly(),
                      selectedColor: AppColors.primaryTeal.withValues(alpha: 0.15),
                      checkmarkColor: AppColors.primaryTeal,
                      labelStyle: GoogleFonts.poppins(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: state.verifiedOnly ? AppColors.primaryTeal : AppColors.darkText,
                      ),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  const SizedBox(height: 4),

                  // Secondary Filter Row: KaamCard Only, Tier & Sort
                  Row(
                    children: [
                      FilterChip(
                        label: Text('KaamCard Only'),
                        selected: state.hasKaamCardOnly,
                        onSelected: (_) => notifier.toggleHasKaamCardOnly(),
                        selectedColor: AppColors.primaryTeal.withValues(alpha: 0.15),
                        checkmarkColor: AppColors.primaryTeal,
                        labelStyle: GoogleFonts.poppins(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: state.hasKaamCardOnly ? AppColors.primaryTeal : AppColors.darkText,
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                      const SizedBox(width: 8),
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
                          // Results Header Count.
                          // The old string said "N verified workers", which
                          // becomes a false statement the moment a single
                          // unclaimed directory listing appears in the list.
                          // Both numbers are computed from THIS list, not from
                          // a server counts envelope covering other rows.
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  UnclaimedCopy.listHeader(
                                      filteredWorkers.length, state.selectedCity),
                                  style: GoogleFonts.poppins(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.grayText,
                                  ),
                                ),
                                if (unclaimedCount > 0) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    UnclaimedCopy.listSubheader(
                                        verifiedCount, unclaimedCount),
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      color: UnclaimedColors.text,
                                    ),
                                  ),
                                ],
                              ],
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
                                  Icon(
                                    state.useGps
                                        ? Icons.location_off_rounded
                                        : Icons.search_off_rounded,
                                    size: 64,
                                    color: AppColors.grayText,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    state.useGps
                                        ? 'No workers near you'
                                        : UnclaimedCopy.listEmpty,
                                    style: GoogleFonts.poppins(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.navy,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    state.useGps
                                        ? 'Workers in your area have not registered their location. Try searching by city instead.'
                                        : 'Try adjusting your search query or trade/tier filters',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(
                                        fontSize: 13, color: AppColors.grayText),
                                  ),
                                  if (state.useGps) ...[
                                    const SizedBox(height: 20),
                                    GestureDetector(
                                      onTap: notifier.useCitySelection,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 20, vertical: 10),
                                        decoration: BoxDecoration(
                                          color: AppColors.primaryTeal,
                                          borderRadius: BorderRadius.circular(30),
                                        ),
                                        child: Text(
                                          'Switch to City Search',
                                          style: GoogleFonts.poppins(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            )
                          else
                            ...filteredWorkers.map((worker) => WorkerCard(worker: worker)),
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
