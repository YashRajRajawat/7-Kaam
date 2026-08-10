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

import 'package:geolocator/geolocator.dart';

double _calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
  return Geolocator.distanceBetween(lat1, lon1, lat2, lon2) / 1000.0;
}

String _getDigiPin(double lat, double lon) {
  final pin1 = (lat * 100).abs().toInt() % 900 + 100;
  final pin2 = (lon * 100).abs().toInt() % 900 + 100;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  final c1 = chars[(lat.abs() * 1000).toInt() % chars.length];
  final c2 = chars[(lon.abs() * 1000).toInt() % chars.length];
  final c3 = chars[((lat + lon).abs() * 100).toInt() % chars.length];
  final c4 = chars[((lat * lon).abs() * 10).toInt() % chars.length];
  return '$pin1-$pin2-$c1$c2$c3$c4';
}

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
      final hue = w.hasKaamCard ? BitmapDescriptor.hueCyan : BitmapDescriptor.hueViolet;
      final dist = _calculateDistanceKm(userLoc.latitude, userLoc.longitude, w.latitude!, w.longitude!).toStringAsFixed(1);
      final digiPin = _getDigiPin(w.latitude!, w.longitude!);

      return Marker(
        markerId: MarkerId(w.id),
        position: LatLng(w.latitude!, w.longitude!),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          w.id == selectedId ? BitmapDescriptor.hueGreen : hue,
        ),
        infoWindow: InfoWindow(
          title: '${w.fullName} (${w.finalScore?.toInt() ?? '—'}/100)',
          snippet: '$dist km away • DigiPin: $digiPin',
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

                  // Header count
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Text(
                      '${mappableWorkers.length} verified workers on map',
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
                    height: 145,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: mappableWorkers.length,
                      itemBuilder: (context, index) {
                        final w = mappableWorkers[index];
                        final isSelected = w.id == selectedId;
                        final dist = _calculateDistanceKm(userLoc.latitude, userLoc.longitude, w.latitude!, w.longitude!).toStringAsFixed(1);
                        final digiPin = _getDigiPin(w.latitude!, w.longitude!);

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
                              border: Border.all(
                                color: isSelected ? AppColors.primaryTeal : AppColors.borderGray,
                                width: isSelected ? 2 : 1,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: isSelected
                                      ? AppColors.primaryTeal.withValues(alpha: 0.15)
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
                                      Text(
                                        '${w.trade.replaceAll('_', ' ')} · ★ ${w.finalScore?.toInt() ?? '—'}',
                                        style: GoogleFonts.poppins(
                                          fontSize: 12,
                                          color: AppColors.primaryTeal,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '📍 $dist km away • $digiPin',
                                        style: GoogleFonts.poppins(
                                          fontSize: 11,
                                          color: AppColors.grayText,
                                          fontWeight: FontWeight.w500,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      if (w.tier != null) TierBadge(tier: w.tier!, isSmall: true),
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
