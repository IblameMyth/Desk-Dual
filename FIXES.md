# Desk Duel update

## Reynolds Trimax pen model
- Replaced the procedural pen rendering with the supplied Reynolds Trimax photograph.
- Removed the cyan/blue photo background so only the pen is rendered on the desk.
- Preserved the original pen proportions and clip/barrel artwork.
- Added an asset cache-buster (`?v=3`) so browsers do not keep an older procedural/blue-background image.
- Physics remains a separate rectangular body, so the photograph does not alter collision behavior.

## Table / footer separation fix
- Removed the forced desktop canvas width that made the classroom canvas taller than the stage and caused the playable desk to be clipped/covered by the footer.
- The stage now owns the full area between the blackboard and footer, with a small physical-looking bottom divider.
- The footer remains its own independent UI band below the stage.
- Canvas sizing is constrained by the real stage box instead of overflowing underneath the controls.

## Clean friend-mode starting positions
- Removed diagonal starting angles that made the long pen sprites visually cross into an X.
- Friend-mode pens now spawn parallel in separated lanes; physics rotation remains unchanged after shots.

### Mobile viewport black-flash fix
The game canvas now keeps its internal bitmap resolution tied to the physics world instead of resizing the bitmap whenever a mobile browser changes its CSS viewport. This prevents the one-frame black canvas flash seen during play while preserving the existing classroom scaling and gameplay physics.
