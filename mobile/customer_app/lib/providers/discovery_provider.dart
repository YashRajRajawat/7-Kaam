import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../core/network/api_service.dart';
import '../models/worker_public_model.dart';
import 'auth_provider.dart';

class DiscoveryState {
  final String selectedTrade;
  final String selectedTier;
  final String sortBy;
  final String searchQuery;
  final String selectedCity;
  final bool isMapView;
  final bool hasKaamCardOnly;
  final bool useGps;
  final double? latitude;
  final double? longitude;
  final List<WorkerPublicModel> workers;
  final String? selectedWorkerId;
  final bool isLoading;
  final String? errorMessage;

  DiscoveryState({
    this.selectedTrade = 'All',
    this.selectedTier = 'Any',
    this.sortBy = 'Best Score',
    this.searchQuery = '',
    this.selectedCity = 'Bangalore',
    this.isMapView = false,
    this.hasKaamCardOnly = false,
    this.useGps = false,
    this.latitude,
    this.longitude,
    this.workers = const [],
    this.selectedWorkerId,
    this.isLoading = false,
    this.errorMessage,
  });

  DiscoveryState copyWith({
    String? selectedTrade,
    String? selectedTier,
    String? sortBy,
    String? searchQuery,
    String? selectedCity,
    bool? isMapView,
    bool? hasKaamCardOnly,
    bool? useGps,
    double? latitude,
    double? longitude,
    List<WorkerPublicModel>? workers,
    String? selectedWorkerId,
    bool? isLoading,
    String? errorMessage,
  }) {
    return DiscoveryState(
      selectedTrade: selectedTrade ?? this.selectedTrade,
      selectedTier: selectedTier ?? this.selectedTier,
      sortBy: sortBy ?? this.sortBy,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedCity: selectedCity ?? this.selectedCity,
      isMapView: isMapView ?? this.isMapView,
      hasKaamCardOnly: hasKaamCardOnly ?? this.hasKaamCardOnly,
      useGps: useGps ?? this.useGps,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      workers: workers ?? this.workers,
      selectedWorkerId: selectedWorkerId ?? this.selectedWorkerId,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }

  List<WorkerPublicModel> get filteredWorkers {
    var result = List<WorkerPublicModel>.from(workers);

    if (selectedTrade != 'All') {
      result = result.where((w) => w.trade.toLowerCase() == selectedTrade.toLowerCase().replaceAll(' ', '_')).toList();
    }

    if (selectedTier == 'EXPERT') {
      result = result.where((w) => w.tier == 'EXPERT').toList();
    } else if (selectedTier == 'GOLD+') {
      result = result.where((w) => w.tier == 'EXPERT' || w.tier == 'GOLD').toList();
    } else if (selectedTier == 'SILVER+') {
      result = result.where((w) => w.tier == 'EXPERT' || w.tier == 'GOLD' || w.tier == 'SILVER').toList();
    }

    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      result = result.where((w) {
        return w.fullName.toLowerCase().contains(q) ||
            w.trade.toLowerCase().contains(q) ||
            (w.locality?.toLowerCase().contains(q) ?? false);
      }).toList();
    }

    if (sortBy == 'Best Score') {
      result.sort((a, b) => (b.finalScore ?? 0).compareTo(a.finalScore ?? 0));
    } else if (sortBy == 'Nearest') {
      result.sort((a, b) => (a.distanceKm ?? double.infinity).compareTo(b.distanceKm ?? double.infinity));
    }
    // 'Newest' is applied server-side (sortBy=recent) — nothing further to do client-side.

    return result;
  }
}

class DiscoveryNotifier extends StateNotifier<DiscoveryState> {
  final ApiService _apiService;

  DiscoveryNotifier(this._apiService) : super(DiscoveryState()) {
    _initLocation();
  }

  Future<void> _initLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
        await useMyLocation();
        return;
      }
    } catch (_) {
      // ignore — fall through to city mode
    }
    fetchWorkers();
  }

  /// Requests location permission if needed and switches to GPS-based
  /// discovery. No reverse-geocoding package is in this app, so the UI
  /// shows a generic "Near you" chip rather than a resolved place name.
  Future<void> useMyLocation() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        state = state.copyWith(useGps: false);
        fetchWorkers();
        return;
      }

      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        state = state.copyWith(useGps: false);
        fetchWorkers();
        return;
      }

      final position = await Geolocator.getCurrentPosition();
      state = state.copyWith(useGps: true, latitude: position.latitude, longitude: position.longitude);
      fetchWorkers();
    } catch (_) {
      state = state.copyWith(useGps: false);
      fetchWorkers();
    }
  }

  void useCitySelection() {
    state = state.copyWith(useGps: false, latitude: null, longitude: null);
    fetchWorkers();
  }

  void setTrade(String trade) {
    state = state.copyWith(selectedTrade: trade);
  }

  void setTier(String tier) {
    state = state.copyWith(selectedTier: tier);
  }

  void setSortBy(String sortBy) {
    final needsRefetch = sortBy == 'Newest' || state.sortBy == 'Newest';
    state = state.copyWith(sortBy: sortBy);
    if (needsRefetch) fetchWorkers();
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setCity(String city) {
    state = state.copyWith(selectedCity: city, useGps: false, latitude: null, longitude: null);
    fetchWorkers();
  }

  void toggleHasKaamCardOnly() {
    state = state.copyWith(hasKaamCardOnly: !state.hasKaamCardOnly);
    fetchWorkers();
  }

  void toggleMapView() {
    state = state.copyWith(isMapView: !state.isMapView);
  }

  void selectWorker(String? workerId) {
    state = state.copyWith(selectedWorkerId: workerId);
  }

  Future<void> fetchWorkers() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final sortParam = switch (state.sortBy) {
        'Nearest' => 'recent', // distance sort happens client-side once distanceKm is present
        'Newest' => 'recent',
        _ => 'score',
      };

      final response = await _apiService.getPublicWorkers(
        trade: state.selectedTrade,
        city: state.useGps ? null : state.selectedCity,
        lat: state.useGps ? state.latitude : null,
        lng: state.useGps ? state.longitude : null,
        hasKaamCard: state.hasKaamCardOnly ? true : null,
        sortBy: sortParam,
      );

      final data = Map<String, dynamic>.from(response.data);
      final rawList = data['workers'] as List? ?? [];
      final workers = rawList.map((w) => WorkerPublicModel.fromJson(Map<String, dynamic>.from(w))).toList();
      state = state.copyWith(workers: workers, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Could not load workers: $e', workers: []);
    }
  }
}

final discoveryProvider = StateNotifierProvider<DiscoveryNotifier, DiscoveryState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return DiscoveryNotifier(apiService);
});
