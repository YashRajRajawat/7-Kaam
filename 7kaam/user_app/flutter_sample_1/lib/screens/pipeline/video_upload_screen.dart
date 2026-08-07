import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:camera/camera.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/worker_provider.dart';
import '../../widgets/custom_button.dart';

class VideoUploadScreen extends ConsumerStatefulWidget {
  const VideoUploadScreen({super.key});

  @override
  ConsumerState<VideoUploadScreen> createState() => _VideoUploadScreenState();
}

class _VideoUploadScreenState extends ConsumerState<VideoUploadScreen> {
  CameraController? _cameraController;
  bool _isCameraInitialized = false;
  bool _isRecording = false;
  bool _recordingFinished = false;
  int _secondsRemaining = 60;
  Timer? _timer;
  XFile? _recordedVideoFile;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isNotEmpty) {
        final camera = cameras.firstWhere(
          (c) => c.lensDirection == CameraLensDirection.back,
          orElse: () => cameras.first,
        );
        _cameraController = CameraController(
          camera,
          ResolutionPreset.high,
          enableAudio: true,
        );
        await _cameraController!.initialize();
        if (mounted) {
          setState(() {
            _isCameraInitialized = true;
          });
        }
      }
    } catch (_) {
      // Fallback mode for environments without camera access
    }
  }

  Future<void> _toggleRecording() async {
    if (_isRecording) {
      // Stop recording
      _timer?.cancel();
      XFile? file;
      if (_cameraController != null && _cameraController!.value.isRecordingVideo) {
        try {
          file = await _cameraController!.stopVideoRecording();
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _isRecording = false;
          _recordingFinished = true;
          _recordedVideoFile = file;
        });
      }
    } else {
      // Start recording
      if (_cameraController != null && _cameraController!.value.isInitialized) {
        try {
          await _cameraController!.startVideoRecording();
        } catch (_) {}
      }

      setState(() {
        _isRecording = true;
        _recordingFinished = false;
        _secondsRemaining = 60;
      });

      _timer = Timer.periodic(const Duration(seconds: 1), (timer) async {
        if (_secondsRemaining > 0) {
          if (mounted) {
            setState(() {
              _secondsRemaining--;
            });
          }
        } else {
          _timer?.cancel();
          XFile? file;
          if (_cameraController != null && _cameraController!.value.isRecordingVideo) {
            try {
              file = await _cameraController!.stopVideoRecording();
            } catch (_) {}
          }
          if (mounted) {
            setState(() {
              _isRecording = false;
              _recordingFinished = true;
              _recordedVideoFile = file;
            });
          }
        }
      });
    }
  }

  Future<void> _uploadRecordedVideo() async {
    final currentWorker = ref.read(workerProvider).worker ?? ref.read(authProvider).currentWorker;
    if (currentWorker != null) {
      ref.read(workerProvider.notifier).setWorker(currentWorker);
    }

    if (_recordedVideoFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No recorded video found — please record again.'), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    List<int> bytes;
    try {
      bytes = await File(_recordedVideoFile!.path).readAsBytes();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not read the recorded video file: $e'), backgroundColor: AppColors.errorRed),
        );
      }
      return;
    }

    final fileName = 'worker_video_${DateTime.now().millisecondsSinceEpoch}.mp4';

    final success = await ref
        .read(workerProvider.notifier)
        .uploadVideoAndTriggerScore(bytes, fileName, fallbackWorker: currentWorker);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Video uploaded! Admin will score it shortly.'),
          backgroundColor: AppColors.successGreen,
        ),
      );
      context.pop();
    } else if (mounted) {
      final error = ref.read(workerProvider).errorMessage ?? 'Upload failed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: AppColors.errorRed),
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final workerState = ref.watch(workerProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Record 60s Skill Video',
          style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Instructions & Countdown Timer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: Colors.black87,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _isRecording ? 'Recording Work Demonstration...' : 'Position camera at your work area',
                    style: GoogleFonts.poppins(color: Colors.white70, fontSize: 13),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _secondsRemaining < 10 ? AppColors.errorRed : AppColors.primaryTeal,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer, color: Colors.white, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          '${_secondsRemaining}s',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Camera Viewfinder Screen
            Expanded(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: double.infinity,
                    color: Colors.grey.shade900,
                    child: _recordingFinished
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.check_circle_outline, color: AppColors.gold, size: 80),
                                const SizedBox(height: 12),
                                Text(
                                  'Video Recorded (60 Seconds)',
                                  style: GoogleFonts.poppins(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Ready to upload for AI & Admin trade evaluation',
                                  style: GoogleFonts.poppins(color: Colors.white70, fontSize: 13),
                                ),
                              ],
                            ),
                          )
                        : (_isCameraInitialized && _cameraController != null
                            ? AspectRatio(
                                aspectRatio: _cameraController!.value.aspectRatio,
                                child: CameraPreview(_cameraController!),
                              )
                            : Center(
                                child: Icon(
                                  _isRecording ? Icons.videocam : Icons.camera_front,
                                  size: 100,
                                  color: _isRecording ? AppColors.errorRed : Colors.white38,
                                ),
                              )),
                  ),

                  // Upload Progress Indicator
                  if (workerState.isLoading)
                    Container(
                      padding: const EdgeInsets.all(24),
                      color: Colors.black87,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          LinearProgressIndicator(
                            value: workerState.videoUploadProgress,
                            backgroundColor: Colors.grey.shade800,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.gold),
                            minHeight: 8,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Uploading video to cloud server...',
                            style: GoogleFonts.poppins(color: Colors.white, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // Bottom Actions
            Container(
              padding: const EdgeInsets.all(24),
              color: Colors.black,
              child: _recordingFinished
                  ? Column(
                      children: [
                        CustomButton(
                          text: 'Looks Good — Upload',
                          isLoading: workerState.isLoading,
                          onPressed: _uploadRecordedVideo,
                        ),
                        const SizedBox(height: 12),
                        CustomButton(
                          text: 'Re-record',
                          isOutlined: true,
                          backgroundColor: Colors.white,
                          onPressed: () {
                            setState(() {
                              _recordingFinished = false;
                              _secondsRemaining = 60;
                              _recordedVideoFile = null;
                            });
                          },
                        ),
                      ],
                    )
                  : GestureDetector(
                      onTap: _toggleRecording,
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 4),
                        ),
                        child: Center(
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            width: _isRecording ? 36 : 64,
                            height: _isRecording ? 36 : 64,
                            decoration: BoxDecoration(
                              color: AppColors.errorRed,
                              borderRadius: BorderRadius.circular(_isRecording ? 8 : 40),
                            ),
                          ),
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
