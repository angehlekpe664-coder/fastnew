import 'dart:math' as math;
import 'package:flutter/material.dart';

class FiliereBackground extends StatefulWidget {
  final String filiere; // 'MIA', 'PC', or 'CBG'
  final Widget child;

  const FiliereBackground({
    super.key,
    required this.filiere,
    required this.child,
  });

  @override
  State<FiliereBackground> createState() => _FiliereBackgroundState();
}

class _FiliereBackgroundState extends State<FiliereBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<_BackgroundElement> _elements = [];

  String get _filiere {
    if (widget.filiere.startsWith('MIA')) return 'MIA';
    if (widget.filiere.startsWith('PC')) return 'PC';
    if (widget.filiere.startsWith('CBG')) return 'CBG';
    if (widget.filiere.startsWith('ENT') || widget.filiere.startsWith('Entrepreneuriat')) return 'ENT';
    return widget.filiere;
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 15),
    )..repeat();

    _generateElements();
  }

  @override
  void didUpdateWidget(covariant FiliereBackground oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.filiere != widget.filiere) {
      _generateElements();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _generateElements() {
    _elements.clear();
    final random = math.Random();
    
    // Générer 8 à 12 éléments de fond
    int count = (_filiere == 'MIA' || _filiere == 'ENT') ? 12 : (_filiere == 'ALL' ? 15 : 8);
    for (int i = 0; i < count; i++) {
      _elements.add(
        _BackgroundElement(
          xPercent: random.nextDouble(),
          yPercent: random.nextDouble(),
          size: 40.0 + random.nextDouble() * 80.0,
          color: _getRandomColor(random),
          rotationSpeed: (random.nextDouble() - 0.5) * 2.0,
          type: _getElementType(random),
          textFormula: _getRandomFormula(random),
          driftX: (random.nextDouble() - 0.5) * 50.0,
          driftY: (random.nextDouble() - 0.5) * 50.0,
        ),
      );
    }
  }

  Color _getRandomColor(math.Random random) {
    if (_filiere == 'MIA' || _filiere == 'ALL') {
      final colors = [
        Colors.blue.withValues(alpha: 0.08),
        Colors.purple.withValues(alpha: 0.06),
        Colors.indigo.withValues(alpha: 0.07),
        Colors.teal.withValues(alpha: 0.07),
        Colors.pink.withValues(alpha: 0.05),
        if (_filiere == 'ALL') ...[
          Colors.cyan.withValues(alpha: 0.08),
          Colors.green.withValues(alpha: 0.06),
          Colors.orange.withValues(alpha: 0.04),
        ]
      ];
      return colors[random.nextInt(colors.length)];
    } else if (_filiere == 'ENT') {
      final colors = [
        Colors.orange.withValues(alpha: 0.07),
        Colors.amber.withValues(alpha: 0.08),
        Colors.brown.withValues(alpha: 0.05),
        Colors.deepOrange.withValues(alpha: 0.05),
        Colors.teal.withValues(alpha: 0.06),
      ];
      return colors[random.nextInt(colors.length)];
    } else {
      // PC et CBG ont des couleurs scientifiques plus calmes (émeraude, cyan, orange léger)
      final colors = [
        Colors.teal.withValues(alpha: 0.07),
        Colors.cyan.withValues(alpha: 0.08),
        Colors.green.withValues(alpha: 0.06),
        Colors.blueGrey.withValues(alpha: 0.08),
        Colors.orange.withValues(alpha: 0.04),
      ];
      return colors[random.nextInt(colors.length)];
    }
  }

  _ElementType _getElementType(math.Random random) {
    if (_filiere == 'MIA') {
      final types = [
        _ElementType.circle,
        _ElementType.triangle,
        _ElementType.square,
        _ElementType.hexagon,
      ];
      return types[random.nextInt(types.length)];
    } else if (_filiere == 'ALL') {
      const types = _ElementType.values;
      return types[random.nextInt(types.length)];
    } else if (_filiere == 'ENT') {
      final types = [
        _ElementType.circle,
        _ElementType.square,
        _ElementType.hexagon,
        _ElementType.formulaText,
      ];
      return types[random.nextInt(types.length)];
    } else {
      final types = [
        _ElementType.benzene,
        _ElementType.molecule,
        _ElementType.formulaText,
      ];
      return types[random.nextInt(types.length)];
    }
  }

  String _getRandomFormula(math.Random random) {
    if (_filiere == 'PC') {
      final formulas = ['H₂O', 'CO²', 'NaCl', 'HCl', 'E=mc²', 'F=ma', 'λ=h/p'];
      return formulas[random.nextInt(formulas.length)];
    } else if (_filiere == 'CBG') {
      final formulas = ['C₆H₁₂O₆', 'DNA', 'ATP', 'CO₂', 'O₂', 'H₂O', 'N₂'];
      return formulas[random.nextInt(formulas.length)];
    } else if (_filiere == 'ENT') {
      final formulas = ['ROI', 'IDEA', 'PLAN', 'GROWTH', 'STARTUP', 'CEO', 'PME', 'B2B', 'CPA', 'LTV'];
      return formulas[random.nextInt(formulas.length)];
    } else if (_filiere == 'ALL') {
      final formulas = ['H₂O', 'CO²', 'NaCl', 'E=mc²', 'DNA', 'ATP', '∫f(x)dx', 'ROI', 'GROWTH'];
      return formulas[random.nextInt(formulas.length)];
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return CustomPaint(
                painter: _FiliereBackgroundPainter(
                  filiere: _filiere,
                  elements: _elements,
                  animationValue: _controller.value,
                ),
              );
            },
          ),
        ),
        widget.child,
      ],
    );
  }
}

enum _ElementType { circle, triangle, square, hexagon, benzene, molecule, formulaText }

class _BackgroundElement {
  final double xPercent;
  final double yPercent;
  final double size;
  final Color color;
  final double rotationSpeed;
  final _ElementType type;
  final String textFormula;
  final double driftX;
  final double driftY;

  _BackgroundElement({
    required this.xPercent,
    required this.yPercent,
    required this.size,
    required this.color,
    required this.rotationSpeed,
    required this.type,
    required this.textFormula,
    required this.driftX,
    required this.driftY,
  });
}

class _FiliereBackgroundPainter extends CustomPainter {
  final String filiere;
  final List<_BackgroundElement> elements;
  final double animationValue;

  _FiliereBackgroundPainter({
    required this.filiere,
    required this.elements,
    required this.animationValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.stroke;

    for (var element in elements) {
      // Calculer la position actuelle avec dérive et animation
      double x = element.xPercent * size.width + element.driftX * math.sin(animationValue * 2 * math.pi);
      double y = element.yPercent * size.height + element.driftY * math.cos(animationValue * 2 * math.pi);
      double angle = animationValue * 2 * math.pi * element.rotationSpeed;

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(angle);

      paint.color = element.color;
      paint.strokeWidth = 2.0;

      switch (element.type) {
        case _ElementType.circle:
          paint.style = PaintingStyle.fill;
          canvas.drawCircle(Offset.zero, element.size / 2, paint);
          break;
        case _ElementType.triangle:
          paint.style = PaintingStyle.stroke;
          final path = Path();
          double half = element.size / 2;
          path.moveTo(0, -half);
          path.lineTo(half, half);
          path.lineTo(-half, half);
          path.close();
          canvas.drawPath(path, paint);
          break;
        case _ElementType.square:
          paint.style = PaintingStyle.stroke;
          double half = element.size / 2;
          canvas.drawRect(Rect.fromLTRB(-half, -half, half, half), paint);
          break;
        case _ElementType.hexagon:
          paint.style = PaintingStyle.stroke;
          _drawHexagon(canvas, Offset.zero, element.size / 2, paint);
          break;
        case _ElementType.benzene:
          paint.style = PaintingStyle.stroke;
          double r = element.size / 2;
          _drawHexagon(canvas, Offset.zero, r, paint);
          // Dessiner le cercle intérieur représentatif du benzène
          paint.strokeWidth = 1.0;
          canvas.drawCircle(Offset.zero, r * 0.6, paint);
          break;
        case _ElementType.molecule:
          paint.style = PaintingStyle.fill;
          // Dessiner un atome central et des liaisons
          double r = element.size / 6;
          canvas.drawCircle(Offset.zero, r, paint);
          
          paint.style = PaintingStyle.stroke;
          paint.strokeWidth = 2.0;
          
          // Liaisons
          canvas.drawLine(Offset.zero, Offset(r * 2.5, r * 1.5), paint);
          canvas.drawLine(Offset.zero, Offset(-r * 2.5, r * 1.5), paint);
          canvas.drawLine(Offset.zero, Offset(0, -r * 3), paint);
          
          paint.style = PaintingStyle.fill;
          canvas.drawCircle(Offset(r * 2.5, r * 1.5), r * 0.7, paint);
          canvas.drawCircle(Offset(-r * 2.5, r * 1.5), r * 0.7, paint);
          canvas.drawCircle(Offset(0, -r * 3), r * 0.7, paint);
          break;
        case _ElementType.formulaText:
          final textPainter = TextPainter(
            text: TextSpan(
              text: element.textFormula,
              style: TextStyle(
                color: element.color.withValues(alpha: (element.color.a * 2.0).clamp(0.0, 1.0)),
                fontSize: element.size * 0.25,
                fontWeight: FontWeight.bold,
                fontFamily: 'Courier',
              ),
            ),
            textDirection: TextDirection.ltr,
          );
          textPainter.layout();
          textPainter.paint(
            canvas,
            Offset(-textPainter.width / 2, -textPainter.height / 2),
          );
          break;
      }

      canvas.restore();
    }
  }

  void _drawHexagon(Canvas canvas, Offset center, double radius, Paint paint) {
    final path = Path();
    for (int i = 0; i < 6; i++) {
      double angle = i * math.pi / 3;
      double x = center.dx + radius * math.cos(angle);
      double y = center.dy + radius * math.sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _FiliereBackgroundPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
        oldDelegate.filiere != filiere;
  }
}
