import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import '../models/trade_test_model.dart';
import 'auth_provider.dart';

class CategoryGroup {
  final String category;
  final List<TradeTestModel> tests;

  CategoryGroup({required this.category, required this.tests});

  factory CategoryGroup.fromJson(Map<String, dynamic> json) {
    return CategoryGroup(
      category: json['category']?.toString() ?? 'General',
      tests: (json['tests'] as List<dynamic>?)
              ?.map((t) => TradeTestModel.fromJson(Map<String, dynamic>.from(t)))
              .toList() ??
          [],
    );
  }
}

class CatalogueState {
  final bool isLoading;
  final String? errorMessage;
  final List<CategoryGroup> categoryGroups;
  final String selectedCategory;
  final String selectedDifficulty;
  final String searchQuery;

  CatalogueState({
    this.isLoading = false,
    this.errorMessage,
    this.categoryGroups = const [],
    this.selectedCategory = 'All',
    this.selectedDifficulty = 'All',
    this.searchQuery = '',
  });

  CatalogueState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<CategoryGroup>? categoryGroups,
    String? selectedCategory,
    String? selectedDifficulty,
    String? searchQuery,
  }) {
    return CatalogueState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      categoryGroups: categoryGroups ?? this.categoryGroups,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      selectedDifficulty: selectedDifficulty ?? this.selectedDifficulty,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class CatalogueNotifier extends StateNotifier<CatalogueState> {
  final Ref ref;
  final ApiService _apiService = ApiService();

  CatalogueNotifier(this.ref) : super(CatalogueState());

  Future<void> fetchCatalogue({String? trade}) async {
    final currentWorker = ref.read(authProvider).currentWorker;
    if (currentWorker == null) {
      state = state.copyWith(errorMessage: 'Not logged in');
      return;
    }
    final workerTrade = trade ?? currentWorker.trade;
    final workerId = currentWorker.id;

    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final res = await _apiService.getTestCatalogue(
        trade: workerTrade,
        category: state.selectedCategory != 'All' ? state.selectedCategory : null,
        difficulty: state.selectedDifficulty != 'All' ? state.selectedDifficulty : null,
        search: state.searchQuery.isNotEmpty ? state.searchQuery : null,
        workerId: workerId,
      );

      if (res.statusCode == 200 && res.data != null && res.data['categories'] is List) {
        final groups = (res.data['categories'] as List)
            .map((c) => CategoryGroup.fromJson(Map<String, dynamic>.from(c)))
            .toList();
        state = state.copyWith(isLoading: false, categoryGroups: groups);
      } else {
        state = state.copyWith(isLoading: false, categoryGroups: []);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  void setCategory(String category) {
    state = state.copyWith(selectedCategory: category);
    fetchCatalogue();
  }

  void setDifficulty(String difficulty) {
    state = state.copyWith(selectedDifficulty: difficulty);
    fetchCatalogue();
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
    fetchCatalogue();
  }
}

final catalogueProvider = StateNotifierProvider<CatalogueNotifier, CatalogueState>((ref) {
  return CatalogueNotifier(ref);
});
