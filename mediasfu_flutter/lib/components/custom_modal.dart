import 'package:flutter/material.dart';

class CustomModal extends StatelessWidget {
  final bool isOpen;
  final VoidCallback onClose;
  final String title;
  final Widget child;

  const CustomModal({
    super.key,
    required this.isOpen,
    required this.onClose,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (!isOpen) return const SizedBox.shrink();

    return GestureDetector(
      onTap: onClose,
      child: Container(
        color: Colors.black.withOpacity(0.05),
        child: Center(
          child: GestureDetector(
            onTap: () {}, // Prevents closing when tapping inside the modal
            child: Container(
              width: 500.0,
              padding: const EdgeInsets.all(24.0),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFF9F9F9), Color(0xFFE0E0E0)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12.0),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 20.0,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 20.0,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.black54),
                        onPressed: onClose,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16.0),
                  // Body
                  Flexible(child: SingleChildScrollView(child: child)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
