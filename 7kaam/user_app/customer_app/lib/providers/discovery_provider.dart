import 'package:flutter_riverpod/flutter_riverpod.dart';
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
      workers: workers ?? this.workers,
      selectedWorkerId: selectedWorkerId ?? this.selectedWorkerId,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  List<WorkerPublicModel> get filteredWorkers {
    var result = List<WorkerPublicModel>.from(workers);

    // Trade filter
    if (selectedTrade != 'All') {
      result = result
          .where((w) => w.trade.toLowerCase() == selectedTrade.toLowerCase())
          .toList();
    }

    // Tier filter
    if (selectedTier == 'EXPERT') {
      result = result.where((w) => w.tier == 'EXPERT').toList();
    } else if (selectedTier == 'GOLD+') {
      result = result.where((w) => w.tier == 'EXPERT' || w.tier == 'GOLD').toList();
    } else if (selectedTier == 'SILVER+') {
      result = result.where((w) => w.tier == 'EXPERT' || w.tier == 'GOLD' || w.tier == 'SILVER').toList();
    }

    // Search query
    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      result = result.where((w) {
        return w.name.toLowerCase().contains(q) ||
            w.trade.toLowerCase().contains(q) ||
            w.locality.toLowerCase().contains(q);
      }).toList();
    }

    // Sort
    if (sortBy == 'Best Score') {
      result.sort((a, b) => b.score.compareTo(a.score));
    } else if (sortBy == 'Nearest') {
      result.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
    } else if (sortBy == 'Most Reviews') {
      result.sort((a, b) => b.workHistories.length.compareTo(a.workHistories.length));
    }

    return result;
  }
}

class DiscoveryNotifier extends StateNotifier<DiscoveryState> {
  final ApiService _apiService;

  DiscoveryNotifier(this._apiService) : super(DiscoveryState()) {
    fetchWorkers();
  }

  void setTrade(String trade) {
    state = state.copyWith(selectedTrade: trade);
  }

  void setTier(String tier) {
    state = state.copyWith(selectedTier: tier);
  }

  void setSortBy(String sortBy) {
    state = state.copyWith(sortBy: sortBy);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setCity(String city) {
    state = state.copyWith(selectedCity: city);
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
      final response = await _apiService.getNearbyWorkers(
        trade: state.selectedTrade,
        tier: state.selectedTier,
        city: state.selectedCity,
        search: state.searchQuery,
      );

      final rawList = response.data['data'] ?? response.data['workers'] ?? response.data;
      if (rawList is List) {
        final workers = rawList
            .map((w) => WorkerPublicModel.fromJson(w as Map<String, dynamic>))
            .toList();
        state = state.copyWith(workers: workers, isLoading: false);
        return;
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Network error: $e');
    }

    // Offline fallback only if network completely fails
    state = state.copyWith(
      workers: _getMockWorkers(state.selectedCity),
      isLoading: false,
    );
  }

  List<WorkerPublicModel> _getMockWorkers(String city) {
    return [
      WorkerPublicModel(
        id: 'w1',
        name: 'Ramesh Kumar',
        trade: 'Electrician',
        city: city,
        locality: 'Koramangala, 4th Block',
        photoUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=300',
        score: 94,
        tier: 'EXPERT',
        scoreBreakdown: ScoreBreakdown(videoScore: 92, testScore: 95, workHistoryScore: 96),
        kaamCardUrl: 'https://7kaam.in/cards/w1.pdf',
        qrToken: 'KC-7K-94821',
        distanceKm: 1.2,
        latitude: 12.9352,
        longitude: 77.6245,
        validUntil: '31 Dec 2026',
        memberSince: 'Mar 2024',
        aadhaarVerified: true,
        workHistories: [
          EmployerHistory(employerName: 'Sobha Developers', role: 'Lead Electrician', rating: 4.9, isVerified: true),
          EmployerHistory(employerName: 'Urban Company', role: 'Senior Technician', rating: 4.8, isVerified: true),
          EmployerHistory(employerName: 'Prestige Estates', role: 'Wiring Specialist', rating: 5.0, isVerified: true),
        ],
      ),
      WorkerPublicModel(
        id: 'w2',
        name: 'Suresh Patil',
        trade: 'Plumber',
        city: city,
        locality: 'Indiranagar, 100ft Road',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
        score: 87,
        tier: 'EXPERT',
        scoreBreakdown: ScoreBreakdown(videoScore: 84, testScore: 88, workHistoryScore: 90),
        kaamCardUrl: 'https://7kaam.in/cards/w2.pdf',
        qrToken: 'KC-7K-87391',
        distanceKm: 2.4,
        latitude: 12.9784,
        longitude: 77.6408,
        validUntil: '15 Nov 2026',
        memberSince: 'Jan 2024',
        aadhaarVerified: true,
        workHistories: [
          EmployerHistory(employerName: 'L&T Construction', role: 'Pipeline Engineer', rating: 4.7, isVerified: true),
          EmployerHistory(employerName: 'Godrej Properties', role: 'Plumbing Lead', rating: 4.8, isVerified: true),
        ],
      ),
      WorkerPublicModel(
        id: 'w3',
        name: 'Vikram Singh',
        trade: 'AC Technician',
        city: city,
        locality: 'HSR Layout, Sector 1',
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
        score: 78,
        tier: 'GOLD',
        scoreBreakdown: ScoreBreakdown(videoScore: 75, testScore: 80, workHistoryScore: 79),
        kaamCardUrl: 'https://7kaam.in/cards/w3.pdf',
        qrToken: 'KC-7K-78402',
        distanceKm: 3.1,
        latitude: 12.9121,
        longitude: 77.6446,
        validUntil: '10 Aug 2026',
        memberSince: 'Jun 2024',
        aadhaarVerified: true,
        workHistories: [
          EmployerHistory(employerName: 'Voltas Service Center', role: 'AC Specialist', rating: 4.6, isVerified: true),
          EmployerHistory(employerName: 'Daikin India', role: 'Maintenance Tech', rating: 4.5, isVerified: true),
        ],
      ),
      WorkerPublicModel(
        id: 'w4',
        name: 'Anil Carpenter',
        trade: 'Carpenter',
        city: city,
        locality: 'BTM Layout, 2nd Stage',
        photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
        score: 82,
        tier: 'GOLD',
        scoreBreakdown: ScoreBreakdown(videoScore: 80, testScore: 82, workHistoryScore: 84),
        kaamCardUrl: 'https://7kaam.in/cards/w4.pdf',
        qrToken: 'KC-7K-82194',
        distanceKm: 4.0,
        latitude: 12.9166,
        longitude: 77.6101,
        validUntil: '20 Oct 2026',
        memberSince: 'Feb 2024',
        aadhaarVerified: true,
        workHistories: [
          EmployerHistory(employerName: 'Livspace Interiors', role: 'Modular Cabinet Expert', rating: 4.8, isVerified: true),
          EmployerHistory(employerName: 'HomeLane', role: 'Woodwork Specialist', rating: 4.7, isVerified: true),
        ],
      ),
      WorkerPublicModel(
        id: 'w5',
        name: 'Dharmendra Painter',
        trade: 'Painter',
        city: city,
        locality: 'Jayanagar, 4th Block',
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300',
        score: 68,
        tier: 'SILVER',
        scoreBreakdown: ScoreBreakdown(videoScore: 65, testScore: 70, workHistoryScore: 69),
        kaamCardUrl: 'https://7kaam.in/cards/w5.pdf',
        qrToken: 'KC-7K-68501',
        distanceKm: 4.8,
        latitude: 12.9299,
        longitude: 77.5826,
        validUntil: '05 Sep 2026',
        memberSince: 'Aug 2024',
        aadhaarVerified: true,
        workHistories: [
          EmployerHistory(employerName: 'Asian Paints Authorized', role: 'Texture Painter', rating: 4.4, isVerified: true),
        ],
      ),
      WorkerPublicModel(
        id: 'w6',
        name: 'Mahesh Welder',
        trade: 'Welder',
        city: city,
        locality: 'Peenya Industrial Area',
        photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300',
        score: 91,
        tier: 'EXPERT',
        scoreBreakdown: ScoreBreakdown(videoScore: 90, testScore: 92, workHistoryScore: 91),
        kaamCardUrl: 'https://7kaam.in/cards/w6.pdf',
        qrToken: 'KC-7K-91043',
        distanceKm: 6.2,
        latitude: 13.0324,
        longitude: 77.5218,
        validUntil: '18 Dec 2026',
        memberSince: 'May 2024',
        aadhaarVerified: true,
        workHistories: [
          EmployerHistory(employerName: 'Tata Steel Fabrication', role: 'Arc & TIG Welder', rating: 4.9, isVerified: true),
          EmployerHistory(employerName: 'Peenya Metal Works', role: 'Industrial Welder', rating: 4.8, isVerified: true),
        ],
      ),
    ];
  }
}

final discoveryProvider = StateNotifierProvider<DiscoveryNotifier, DiscoveryState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return DiscoveryNotifier(apiService);
});
