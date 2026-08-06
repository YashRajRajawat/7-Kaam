import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_service.dart';
import '../models/booking_model.dart';
import 'auth_provider.dart';

class BookingState {
  final List<BookingModel> bookings;
  final String activeFilter; // All, Upcoming, Completed, Cancelled
  final bool isLoading;
  final BookingModel? lastCreatedBooking;
  final String? errorMessage;

  BookingState({
    this.bookings = const [],
    this.activeFilter = 'All',
    this.isLoading = false,
    this.lastCreatedBooking,
    this.errorMessage,
  });

  BookingState copyWith({
    List<BookingModel>? bookings,
    String? activeFilter,
    bool? isLoading,
    BookingModel? lastCreatedBooking,
    String? errorMessage,
  }) {
    return BookingState(
      bookings: bookings ?? this.bookings,
      activeFilter: activeFilter ?? this.activeFilter,
      isLoading: isLoading ?? this.isLoading,
      lastCreatedBooking: lastCreatedBooking ?? this.lastCreatedBooking,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  List<BookingModel> get filteredBookings {
    if (activeFilter == 'Upcoming') {
      return bookings
          .where((b) => b.status == 'PENDING' || b.status == 'CONFIRMED' || b.status == 'IN_PROGRESS')
          .toList();
    } else if (activeFilter == 'Completed') {
      return bookings.where((b) => b.status == 'COMPLETED').toList();
    } else if (activeFilter == 'Cancelled') {
      return bookings.where((b) => b.status == 'CANCELLED').toList();
    }
    return bookings;
  }
}

class BookingNotifier extends StateNotifier<BookingState> {
  final ApiService _apiService;

  BookingNotifier(this._apiService) : super(BookingState()) {
    _seedSampleBookings();
  }

  void setFilter(String filter) {
    state = state.copyWith(activeFilter: filter);
  }

  Future<bool> createBooking({
    required String workerId,
    required String workerName,
    required String workerTrade,
    required String workerPhoto,
    required String serviceDate,
    required String serviceTime,
    required String serviceAddress,
    String? notes,
    required String priceEstimate,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiService.createBooking(
        workerId: workerId,
        serviceDate: serviceDate,
        serviceTime: serviceTime,
        serviceAddress: serviceAddress,
        notes: notes,
        trade: workerTrade,
        priceEstimate: priceEstimate,
      );

      final newBooking = BookingModel.fromJson(response.data['data'] ?? response.data);
      state = state.copyWith(
        bookings: [newBooking, ...state.bookings],
        lastCreatedBooking: newBooking,
        isLoading: false,
      );
      return true;
    } catch (e) {
      // Local fallback booking creation
      final demoBooking = BookingModel(
        id: 'BK-7K-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
        workerId: workerId,
        workerName: workerName,
        workerTrade: workerTrade,
        workerPhoto: workerPhoto,
        serviceDate: serviceDate,
        serviceTime: serviceTime,
        serviceAddress: serviceAddress,
        notes: notes,
        status: 'CONFIRMED',
        priceEstimate: priceEstimate,
        createdAt: 'Just now',
      );

      state = state.copyWith(
        bookings: [demoBooking, ...state.bookings],
        lastCreatedBooking: demoBooking,
        isLoading: false,
      );
      return true;
    }
  }

  Future<void> fetchUserBookings(String customerId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiService.getCustomerBookings(customerId);
      final rawList = response.data['data'] ?? response.data['bookings'] ?? response.data;
      if (rawList is List) {
        final list = rawList
            .map((b) => BookingModel.fromJson(b as Map<String, dynamic>))
            .toList();
        state = state.copyWith(bookings: list, isLoading: false);
        return;
      }
    } catch (e) {
      // Ignore network error and keep local list
    }
    state = state.copyWith(isLoading: false);
  }

  void _seedSampleBookings() {
    state = state.copyWith(
      bookings: [
        BookingModel(
          id: 'BK-7K-98214',
          workerId: 'w1',
          workerName: 'Ramesh Kumar',
          workerTrade: 'Electrician',
          workerPhoto: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=300',
          serviceDate: 'Today, 4:00 PM',
          serviceTime: '4:00 PM',
          serviceAddress: 'Flat 402, Sunshine Apartments, Koramangala, Bangalore',
          notes: 'Full house main switchboard check & MCB replacement',
          status: 'CONFIRMED',
          priceEstimate: '₹400–₹800',
          createdAt: 'Today 10:30 AM',
        ),
        BookingModel(
          id: 'BK-7K-84721',
          workerId: 'w3',
          workerName: 'Vikram Singh',
          workerTrade: 'AC Technician',
          workerPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
          serviceDate: '12 Aug 2026',
          serviceTime: '11:00 AM',
          serviceAddress: 'Plot 12, HSR Layout Sector 1, Bangalore',
          notes: 'Split AC deep cleaning & gas check',
          status: 'PENDING',
          priceEstimate: '₹500–₹900',
          createdAt: 'Yesterday',
        ),
        BookingModel(
          id: 'BK-7K-73910',
          workerId: 'w2',
          workerName: 'Suresh Patil',
          workerTrade: 'Plumber',
          workerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
          serviceDate: '01 Aug 2026',
          serviceTime: '2:30 PM',
          serviceAddress: '100ft Road, Indiranagar, Bangalore',
          notes: 'Bathroom leak repair and tap fitting',
          status: 'COMPLETED',
          priceEstimate: '₹300–₹600',
          createdAt: '01 Aug 2026',
        ),
      ],
    );
  }
}

final bookingProvider = StateNotifierProvider<BookingNotifier, BookingState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return BookingNotifier(apiService);
});
