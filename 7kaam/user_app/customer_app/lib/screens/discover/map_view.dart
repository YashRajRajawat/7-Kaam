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

class DiscoverMapView extends ConsumerStatefulWidget {
  const DiscoverMapView({super.key});

  @override
  ConsumerState<DiscoverMapView> createState() => _DiscoverMapViewState();
}

class _DiscoverMapViewState extends ConsumerState<DiscoverMapView> {
  GoogleMapController? _mapController;
  final LatLng _initialCenter = const LatLng(12.9352, 77.6245); // Bangalore center

  Set<Marker> _buildMarkers(List<WorkerPublicModel> workers, String? selectedId) {
    return workers.map((w) {
      double hue;
      switch (w.tier.toUpperCase()) {
        case 'EXPERT':
          hue = BitmapDescriptor.hueCyan;
          break;
        case 'GOLD':
          hue = BitmapDescriptor.hueOrange;
          break;
        case 'SILVER':
          hue = BitmapDescriptor.hueAzure;
          break;
        case 'BRONZE':
        default:
          hue = BitmapDescriptor.hueRed;
          break;
      }

      return Marker(
        markerId: MarkerId(w.id),
        position: LatLng(w.latitude, w.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          w.id == selectedId ? BitmapDescriptor.hueGreen : hue,
        ),
        infoWindow: InfoWindow(
          title: '${w.name} (${w.score}/100)',
          snippet: '${w.trade} · ${w.tier}',
          onTap: () {
            context.push('/worker/${w.id}', extra: w);
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
    final selectedId = discoveryState.selectedWorkerId;

    return Stack(
      children: [
        // Google Map Component
        GoogleMap(
          initialCameraPosition: CameraPosition(
            target: workers.isNotEmpty
                ? LatLng(workers.first.latitude, workers.first.longitude)
                : _initialCenter,
            zoom: 13,
          ),
          onMapCreated: (controller) {
            _mapController = controller;
          },
          markers: _buildMarkers(workers, selectedId),
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

                  // Header count
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Text(
                      '${workers.length} verified workers on map',
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.navy,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Horizontal Cards List
                  SizedBox(
                    height: 140,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: workers.length,
                      itemBuilder: (context, index) {
                        final w = workers[index];
                        final isSelected = w.id == selectedId;

                        return GestureDetector(
                          onTap: () {
                            ref.read(discoveryProvider.notifier).selectWorker(w.id);
                            _mapController?.animateCamera(
                              CameraUpdate.newLatLng(
                                LatLng(w.latitude, w.longitude),
                              ),
                            );
                          },
                          child: Container(
                            width: 260,
                            margin: const EdgeInsets.only(right: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? AppColors.primaryTeal : AppColors.borderGray,
                                width: isSelected ? 2 : 1,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: isSelected
                                      ? AppColors.primaryTeal.withOpacity(0.15)
                                      : Colors.black.withOpacity(0.04),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(24),
                                  child: CachedNetworkImage(
                                    imageUrl: w.photoUrl,
                                    width: 48,
                                    height: 48,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        w.name,
                                        style: GoogleFonts.poppins(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        '${w.trade} · ★ ${w.score}',
                                        style: GoogleFonts.poppins(
                                          fontSize: 12,
                                          color: AppColors.primaryTeal,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
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
