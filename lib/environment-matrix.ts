/**
 * Environment Matrix Representation (18x16 grid)
 * Each cell represents 1x1 meter physical space
 */

export type CellType = "." | "S" | "O" | "R" | "C"; // Empty, Shelf, Obstacle, Robot, Charging

export interface EnvironmentMatrix {
  matrix: CellType[][];
  width: number; // 18
  height: number; // 16
}

/**
 * Create an empty 18x16 environment matrix
 */
export function createEmptyMatrix(): EnvironmentMatrix {
  const matrix: CellType[][] = [];
  for (let x = 0; x < 18; x++) {
    matrix[x] = [];
    for (let y = 0; y < 16; y++) {
      matrix[x][y] = ".";
    }
  }
  return { matrix, width: 18, height: 16 };
}

/**
 * Create a test environment with shelves and obstacles
 */
export function createTestEnvironment(): EnvironmentMatrix {
  const env = createEmptyMatrix();
  
  // Add shelves (S) in a grid pattern
  for (let x = 2; x < 16; x += 3) {
    for (let y = 2; y < 14; y += 3) {
      env.matrix[x][y] = "S";
    }
  }
  
  // Add charging station (C) at bottom right
  env.matrix[16][14] = "C";
  env.matrix[17][14] = "C";
  env.matrix[16][15] = "C";
  env.matrix[17][15] = "C";
  
  // Add some obstacles (O)
  env.matrix[5][8] = "O";
  env.matrix[10][5] = "O";
  env.matrix[12][10] = "O";
  
  return env;
}

/**
 * Convert matrix to text representation for LLM
 */
export function matrixToText(matrix: EnvironmentMatrix): string {
  let output = "\n   ";
  // Column headers
  for (let x = 0; x < matrix.width; x++) {
    output += (x % 10).toString();
  }
  output += "\n";
  
  for (let y = 0; y < matrix.height; y++) {
    output += String(y).padStart(2) + " ";
    for (let x = 0; x < matrix.width; x++) {
      output += matrix.matrix[x][y];
    }
    output += "\n";
  }
  
  output += "\nLegend: . = Empty, S = Shelf, O = Obstacle, R = Robot, C = Charging Station\n";
  return output;
}

/**
 * Place robot at position
 */
export function placeRobot(matrix: EnvironmentMatrix, x: number, y: number): void {
  if (x >= 0 && x < matrix.width && y >= 0 && y < matrix.height) {
    matrix.matrix[x][y] = "R";
  }
}

/**
 * Check if position is valid (not obstacle or shelf)
 */
export function isValidPosition(matrix: EnvironmentMatrix, x: number, y: number): boolean {
  if (x < 0 || x >= matrix.width || y < 0 || y >= matrix.height) {
    return false;
  }
  const cell = matrix.matrix[x][y];
  return cell === "." || cell === "C" || cell === "R";
}
