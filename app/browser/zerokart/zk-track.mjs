import Matter from 'matter-js';

const { Bodies, Composite, Vertices, Vector } = Matter;

export class ZeroTrack extends HTMLElement {
    constructor() {
        super();
        this._trackBodies = [];
        this._obstacles = [];
        this._checkpoints = [];
        this._startPositions = [];
    }

    connectedCallback() {
        // Read track attributes
        this._name = this.getAttribute('name') || 'Unnamed Track';
        this._width = parseInt(this.getAttribute('width')) || 2000;
        this._height = parseInt(this.getAttribute('height')) || 2000;
    }

    initializePhysics(world) {
        // Create track boundaries
        this._createTrackBoundaries();

        // Process child obstacle elements
        this._processObstacles();

        // Generate checkpoints along the track
        this._createCheckpoints();

        // Create starting positions
        this._createStartPositions();

        // Add all track bodies to the world
        Composite.add(world, [...this._trackBodies]);
    }

    _createTrackBoundaries() {
        // Default track is a rounded rectangle circuit
        // For a more sophisticated track, this could be defined by path points in HTML

        const trackWidth = this._width;
        const trackHeight = this._height;
        const wallThickness = 50;

        // Outer walls
        const outerBounds = [
            { x: 0, y: 0 },
            { x: trackWidth, y: 0 },
            { x: trackWidth, y: trackHeight },
            { x: 0, y: trackHeight }
        ];

        // Inner walls
        const innerBounds = [
            { x: wallThickness * 3, y: wallThickness * 3 },
            { x: trackWidth - wallThickness * 3, y: wallThickness * 3 },
            { x: trackWidth - wallThickness * 3, y: trackHeight - wallThickness * 3 },
            { x: wallThickness * 3, y: trackHeight - wallThickness * 3 }
        ];

        // Create outer track boundaries
        const outerWalls = this._createWallsFromPoints(outerBounds, wallThickness, {
            fillStyle: '#666666',
            strokeStyle: '#FFFFFF',
            lineWidth: 3
        });

        // Create inner track boundaries
        const innerWalls = this._createWallsFromPoints(innerBounds, wallThickness, {
            fillStyle: '#444444',
            strokeStyle: '#FFFFFF',
            lineWidth: 2
        });

        // Add walls to track bodies
        this._trackBodies.push(...outerWalls, ...innerWalls);

        // Create track surface (visual only)
        const trackSurface = Bodies.fromVertices(
            trackWidth / 2,
            trackHeight / 2,
            [
                Vertices.hull(Vertices.clockwiseSort(outerBounds.map(p => {return Vector.create(p.x, p.y)}))),
                Vertices.hull(Vertices.clockwiseSort(innerBounds.map(p => {return Vector.create(p.x, p.y)})))
            ],
            {
                isStatic: true,
                render: {
                    fillStyle: '#333333',
                    strokeStyle: '#FFFFFF',
                    lineWidth: 1
                }
            },
            true
        );

        this._trackBodies.push(trackSurface);
    }

    _createWallsFromPoints(points, thickness, style) {
        const walls = [];

        for (let i = 0; i < points.length; i++) {
            const currentPoint = points[i];
            const nextPoint = points[(i + 1) % points.length];

            // Calculate wall center and dimensions
            const center = {
                x: (currentPoint.x + nextPoint.x) / 2,
                y: (currentPoint.y + nextPoint.y) / 2
            };

            const deltaX = nextPoint.x - currentPoint.x;
            const deltaY = nextPoint.y - currentPoint.y;
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX);

            // Create the wall body
            const wall = Bodies.rectangle(center.x, center.y, length, thickness, {
                isStatic: true,
                angle,
                label: 'track-wall',
                render: style
            });

            walls.push(wall);
        }

        return walls;
    }

    _processObstacles() {
        // Get all child obstacle elements
        const obstacleElements = this.querySelectorAll('zk-obstacle');

        obstacleElements.forEach(obstacleElement => {
            // Create physics body for this obstacle
            const type = obstacleElement.getAttribute('type') || 'generic';
            const x = parseFloat(obstacleElement.getAttribute('x')) || 0;
            const y = parseFloat(obstacleElement.getAttribute('y')) || 0;
            const width = parseFloat(obstacleElement.getAttribute('width')) || 50;
            const height = parseFloat(obstacleElement.getAttribute('height')) || 50;
            const angle = parseFloat(obstacleElement.getAttribute('angle')) || 0;
            const radius = parseFloat(obstacleElement.getAttribute('radius')) || 25;

            // Create appropriate obstacle body based on type
            let obstacle;

            switch(type) {
                case 'ramp':
                    obstacle = Bodies.rectangle(x, y, width, height, {
                        isStatic: true,
                        angle: angle * Math.PI / 180,
                        label: 'obstacle-ramp',
                        obstacleType: 'ramp',
                        jumpForce: parseFloat(obstacleElement.getAttribute('force')) || 0.1,
                        render: {
                            fillStyle: '#FF9900',
                            strokeStyle: '#FFDD00',
                            lineWidth: 1
                        }
                    });
                    break;

                case 'bounce-pad':
                    obstacle = Bodies.rectangle(x, y, width, height, {
                        isStatic: true,
                        angle: angle * Math.PI / 180,
                        label: 'obstacle-bounce',
                        obstacleType: 'bounce-pad',
                        boostForce: parseFloat(obstacleElement.getAttribute('force')) || 0.05,
                        render: {
                            fillStyle: '#00CCFF',
                            strokeStyle: '#00FFFF',
                            lineWidth: 1
                        }
                    });
                    break;

                case 'oil-slick':
                    obstacle = Bodies.circle(x, y, radius, {
                        isStatic: true,
                        label: 'obstacle-oil',
                        obstacleType: 'oil-slick',
                        slipFactor: parseFloat(obstacleElement.getAttribute('friction')) || 0.2,
                        render: {
                            fillStyle: 'rgba(0, 0, 0, 0.5)',
                            strokeStyle: '#333333',
                            lineWidth: 1
                        },
                        isSensor: true // Let objects pass through but detect collision
                    });
                    break;

                default:
                    obstacle = Bodies.rectangle(x, y, width, height, {
                        isStatic: true,
                        angle: angle * Math.PI / 180,
                        label: 'obstacle-generic',
                        render: {
                            fillStyle: '#888888',
                            strokeStyle: '#555555',
                            lineWidth: 1
                        }
                    });
            }

            this._obstacles.push(obstacle);
            this._trackBodies.push(obstacle);
        });
    }

    _createCheckpoints() {
        // For simple track, create evenly spaced checkpoints
        const trackWidth = this._width;
        const trackHeight = this._height;
        const wallThickness = 50;
        const checkpointCount = 8;

        // Create a path around the track center line
        const centerPath = [
            { x: trackWidth / 2, y: wallThickness * 3 / 2 },                            // top
            { x: trackWidth - wallThickness * 3 / 2, y: trackHeight / 2 },              // right
            { x: trackWidth / 2, y: trackHeight - wallThickness * 3 / 2 },              // bottom
            { x: wallThickness * 3 / 2, y: trackHeight / 2 }                            // left
        ];

        // Generate checkpoints along the path
        for (let i = 0; i < checkpointCount; i++) {
            const t = i / checkpointCount;
            const segmentIndex = Math.floor(t * 4);
            const segmentT = (t * 4) - segmentIndex;

            const p1 = centerPath[segmentIndex];
            const p2 = centerPath[(segmentIndex + 1) % 4];

            const checkpoint = {
                x: p1.x + (p2.x - p1.x) * segmentT,
                y: p1.y + (p2.y - p1.y) * segmentT,
                radius: 100,
                index: i
            };

            this._checkpoints.push(checkpoint);

            // Optionally visualize checkpoints
            const checkpointVisual = Bodies.circle(checkpoint.x, checkpoint.y, 10, {
                isStatic: true,
                isSensor: true,
                render: {
                    fillStyle: i === 0 ? '#FFFF00' : '#00FF00',
                    opacity: 0.3
                }
            });

            this._trackBodies.push(checkpointVisual);
        }
    }

    _createStartPositions() {
        // Create start positions along the start line
        const startLine = this._checkpoints[0];
        const trackDirection = Vector.normalise({
            x: this._checkpoints[1].x - startLine.x,
            y: this._checkpoints[1].y - startLine.y
        });

        // Perpendicular to track direction for start grid
        const perpendicular = { x: -trackDirection.y, y: trackDirection.x };

        // Position karts side by side on start line
        for (let i = 0; i < 4; i++) {
            const offset = (i - 1.5) * 40;

            this._startPositions.push({
                x: startLine.x + perpendicular.x * offset - trackDirection.x * 50,
                y: startLine.y + perpendicular.y * offset - trackDirection.y * 50
            });
        }
    }

    getCheckpoints() {
        return this._checkpoints;
    }

    getStartPosition(index) {
        return this._startPositions[index] || this._startPositions[0];
    }
}

customElements.define('zk-track', ZeroTrack);