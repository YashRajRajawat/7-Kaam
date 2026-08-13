import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/constants/app_colors.dart';
import '../../models/worker_public_model.dart';
import '../../providers/discovery_provider.dart';
import '../../widgets/tier_badge.dart';
import '../../widgets/unclaimed_badge.dart';

import 'package:geolocator/geolocator.dart';

double _calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
  return Geolocator.distanceBetween(lat1, lon1, lat2, lon2) / 1000.0;
}

// `_getDigiPin` was removed here on purpose. It was arithmetic on latitude and
// longitude dressed up as India Post's DIGIPIN — a fabricated government-style
// identifier attached to a real street address, for every worker on the map,
// not only imported listings. Do not reintroduce it in any form. If a real
// DIGIPIN is ever needed, it must come from India Post, over the wire.

class DiscoverMapView extends ConsumerStatefulWidget {
  const DiscoverMapView({super.key});

  @override
  ConsumerState<DiscoverMapView> createState() => _DiscoverMapViewState();
}

class _DiscoverMapViewState extends ConsumerState<DiscoverMapView> {
  GoogleMapController? _mapController;
  final LatLng _initialCenter = const LatLng(12.9352, 77.6245); // Bangalore center

  Set<Marker> _buildMarkers(List<WorkerPublicModel> workers, String? selectedId, LatLng userLoc) {
    return workers.where((w) => w.latitude != null && w.longitude != null).map((w) {
      // Cyan == KaamCard certified, violet == registered but no KaamCard.
      // Unclaimed directory listings must reuse neither. Azure is the closest
      // neutral available from the stock marker hues.
      // TODO(§E.6): replace with the slate `assets/markers/unclaimed_pin.png`
      // once pubspec asset registration is in scope for this change set.
      final hue = w.isUnclaimed
          ? BitmapDescriptor.hueAzure
          : (w.hasKaamCard ? BitmapDescriptor.hueCyan : BitmapDescriptor.hueViolet);
      final dist = _calculateDistanceKm(userLoc.latitude, userLoc.longitude, w.latitude!, w.longitude!).toStringAsFixed(1);

      return Marker(
        markerId: MarkerId(w.id),
        position: LatLng(w.latitude!, w.longitude!),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          w.id == selectedId ? BitmapDescriptor.hueGreen : hue,
        ),
        infoWindow: InfoWindow(
          // Name only. The old title appended '(—/100)' when finalScore was
          // null, which reads as a score that failed to load rather than a
          // business that was never assessed.
          title: w.fullName,
          snippet: w.isUnclaimed
              ? UnclaimedCopy.mapInfoSnippet(dist)
              : '$dist km away',
          onTap: () {
            context.push('/worker/${w.id}');
          },
        ),
        onTap: () {
          ref.read(discoveryProvider.notifier).selectWorker(w.id);
        },
      );
    }).toSet();
  }

  @override
  Widget build(BuildContext context) {
    final discoveryState = ref.watch(discoveryProvider);
    final workers = discoveryState.filteredWorkers;
    final mappableWorkers = workers.where((w) => w.latitude != null && w.longitude != null).toList();
    final mappableUnclaimedCount = mappableWorkers.where((w) => w.isUnclaimed).length;
    final selectedId = discoveryState.selectedWorkerId;
    final userLoc = discoveryState.useGps && discoveryState.latitude != null
        ? LatLng(discoveryState.latitude!, discoveryState.longitude!)
        : _initialCenter;

    return Stack(
      children: [
        // Google Map Component
        GoogleMap(
          initialCameraPosition: CameraPosition(
            target: mappableWorkers.isNotEmpty
                ? LatLng(mappableWorkers.first.latitude!, mappableWorkers.first.longitude!)
                : userLoc,
            zoom: 13,
          ),
          onMapCreated: (controller) {
            _mapController = controller;
          },
          markers: _buildMarkers(workers, selectedId, userLoc),
          myLocationEnabled: true,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
        ),

        // Draggable Bottom Sheet with Worker Cards (Airbnb style)
        DraggableScrollableSheet(
          initialChildSize: 0.28,
          minChildSize: 0.12,
          maxChildSize: 0.60,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 10,
                    offset: Offset(0, -4),
                  ),
                ],
              ),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(vertical: 12),
                children: [
                  // Handle indicator
                  Center(
                    child: Container(
                      width: 40,
                      height: 5,
                      decoration: BoxDecoration(
                        color: AppColors.borderGray,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Header count. Never "verified workers" — this list can
                  // contain unclaimed public-directory listings.
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          UnclaimedCopy.mapHeader(mappableWorkers.length),
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.navy,
                          ),
                        ),
                        if (mappableUnclaimedCount > 0) ...[
                          const SizedBox(height: 2),
                          Text(
                            UnclaimedCopy.mapSubheader(mappableUnclaimedCount),
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              color: UnclaimedColors.text,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Horizontal Cards List
                  SizedBox(
                    height: 145,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: mappableWorkers.length,
                      itemBuilder: (context, index) {
                        final w = mappableWorkers[index];
                        final isSelected = w.id == selectedId;
                        final dist = _calculateDistanceKm(userLoc.latitude, userLoc.longitude, w.latitude!, w.longitude!).toStringAsFixed(1);

                        return GestureDetector(
                          onTap: () {
                            ref.read(discoveryProvider.notifier).selectWorker(w.id);
                            _mapController?.animateCamera(
                              CameraUpdate.newLatLng(
                                LatLng(w.latitude!, w.longitude!),
                              ),
                            );
                          },
                          child: Container(
                            width: 270,
                            margin: const EdgeInsets.only(right: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              // Teal is the verified colour — never paint it on
                              // an unclaimed listing, not even as a selection
                              // highlight.
                              border: Border.all(
                                color: isSelected
                                    ? (w.isUnclaimed
                                        ? UnclaimedColors.accent
                                        : AppColors.primaryTeal)
                                    : (w.isUnclaimed
                                        ? UnclaimedColors.border
                                        : AppColors.borderGray),
                                width: isSelected ? 2 : 1,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: isSelected
                                      ? (w.isUnclaimed
                                              ? UnclaimedColors.accent
                                              : AppColors.primaryTeal)
                                          .withValues(alpha: 0.15)
                                      : Colors.black.withValues(alpha: 0.04),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(24),
                                  child: w.profilePhotoUrl != null
                                      ? CachedNetworkImage(
                                          imageUrl: w.profilePhotoUrl!,
                                          width: 48,
                                          height: 48,
                                          fit: BoxFit.cover,
                                        )
                                      : Container(
                                          width: 48,
                                          height: 48,
                                          color: AppColors.borderGray,
                                          child: const Icon(Icons.person, color: Colors.grey),
                                        ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        w.fullName,
                                        style: GoogleFonts.poppins(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      // Trade only unless there is a real
                                      // score. '★ —' reads as a star rating
                                      // that failed to load.
                                      Text(
                                        w.finalScore != null
                                            ? '${w.trade.replaceAll('_', ' ')} · ★ ${w.finalScore!.toInt()}'
                                            : w.trade.replaceAll('_', ' '),
                                        style: GoogleFonts.poppins(
                                          fontSize: 12,
                                          color: w.isUnclaimed
                                              ? UnclaimedColors.text
                                              : AppColors.primaryTeal,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '📍 $dist km away',
                                        style: GoogleFonts.poppins(
                                          fontSize: 11,
                                          color: AppColors.grayText,
                                          fontWeight: FontWeight.w500,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      // INVARIANT I4 — the disclosure sits in
                                      // the same card as the name.
                                      if (w.isUnclaimed)
                                        const UnclaimedBadge.chip()
                                      else if (w.tier != null)
                                        TierBadge(tier: w.tier, isSmall: true),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
