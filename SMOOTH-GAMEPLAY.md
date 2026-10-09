# Smooth gameplay update

- Physics simulation increased from 60 Hz to 120 Hz for smoother pen trajectories.
- Physics damping/friction is scaled by timestep so the feel stays consistent.
- Large frame stalls are clamped to avoid teleporting after tab switches or lag spikes.
- Canvas uses high-quality image smoothing and `desynchronized` rendering where supported.
- Pen rendering explicitly disables all artificial pen shadows.
- Existing classroom/table/footer separation and pen models are preserved.

AI mode uses the same fixed-step 120 Hz simulation, render interpolation, and clean parallel spawn layout as Friends mode.
