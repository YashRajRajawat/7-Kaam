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

  /// 'Verified only' filter. Default false: unclaimed public-directory
  /// listings are shown, always ranked last and always labelled.
  final bool verifiedOnly;
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
    this.verifiedOnly = false,
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
    bool? verifiedOnly,
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
      verifiedOnly: verifiedOnly ?? this.verifiedOnly,
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

    // 'Verified only' is also enforced server-side (verifiedOnly=true). It is
    // repeated here on purpose: an older backend build that does not know the
    // query param would otherwise return unclaimed rows while the chip reads
    // as active. A filter that silently does nothing is the failure mode this
    // whole change set exists to prevent.
    if (verifiedOnly) {
      result = result.where((w) => !w.isUnclaimed).toList();
    }

    if (selectedTrade != 'All') {
      result = result.where((w) => w.trade.toLowerCase() == selectedTrade.toLowerCase().replaceAll(' ', '_')).toList();
    }

    // null tier is intentionally excluded — a tier filter IS a verification
    // filter. Do not "fix" this to include unclaimed listings: an unclaimed
    // public-directory listing has tier == null because 7 Kaam never assessed
    // it, so it can never satisfy SILVER+/GOLD+/EXPERT. Selecting any tier
    // other than 'Any' therefore empties the unclaimed block entirely, which
    // is the correct and intended result.
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

    // Verified workers always rank above unclaimed listings, in EVERY sort
    // mode — the partition is the primary key, mirroring the server (§D.4).
    // Ties break on fullName then id so the unclaimed block does not visibly
    // reshuffle on every rebuild (Dart's List.sort is not stable).
    int byPartition(WorkerPublicModel a, WorkerPublicModel b) =>
        a.isUnclaimed == b.isUnclaimed ? 0 : (a.isUnclaimed ? 1 : -1);
    int byName(WorkerPublicModel a, WorkerPublicModel b) {
      final n = a.fullName.compareTo(b.fullName);
      return n != 0 ? n : a.id.compareTo(b.id);
    }

    result.sort((a, b) {
      final p = byPartition(a, b);
      if (p != 0) return p;

      if (sortBy == 'Nearest') {
        final d = (a.distanceKm ?? double.infinity)
            .compareTo(b.distanceKm ?? double.infinity);
        if (d != 0) return d;
      } else if (sortBy == 'Best Score') {
        // -1, NOT 0. With `?? 0` a genuinely-assessed worker who scored 0
        // would tie with every never-assessed row. -1 is outside the valid
        // score domain and cannot collide with a real score.
        final s = (b.finalScore ?? -1).compareTo(a.finalScore ?? -1);
        if (s != 0) return s;
      }
      // 'Newest' ordering comes from the server (sortBy=recent); only the
      // verified/unclaimed partition and the tiebreak are applied here.
      return byName(a, b);
    });

    return result;
  }

  // NOTE ON RESULT COUNTS: the verified / unclaimed counts in the discover and
  // map headers are derived from `filteredWorkers` at the call site, NOT from
  // a server `counts` envelope. The two cover different row sets — the server
  // counts every post-filter row across all pages, this list is one page of 20
  // further filtered and sorted on the device — and mixing them yields a
  // header that contradicts the list printed directly beneath it. Do not
  // "improve" this by feeding the header from the API.
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

  void toggleVerifiedOnly() {
    state = state.copyWith(verifiedOnly: !state.verifiedOnly);
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
        verifiedOnly: state.verifiedOnly ? true : null,
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
