export class GameMatter extends HTMLElement {
  // ...existing code...

  // Find where hexagons are defined and reduce their size
  // This might be in a createHexagon method or similar
  createHexagon(x, y) {
    // Reduce the radius/size parameter (example: from 30 to 20)
    const radius = 20; // Smaller size (adjust as needed)

    // The rest of the hexagon creation code would use this smaller radius
    return Matter.Bodies.polygon(x, y, 6, radius);
  }

  // Alternatively, if there's a constant or property defined for hexagon size:
  // HEXAGON_SIZE = 20; // Reduced from a larger value

  // ...existing code...
}
