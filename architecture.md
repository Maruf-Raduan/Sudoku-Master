# Architecture Overview — Sudoku-Master

This document summarizes the high-level architecture for the Sudoku-Master repository.
It is intended to help contributors and maintainers quickly understand the project's structure, responsibilities of each component, and extension points.

## Goals
- Provide a robust Sudoku solver and generator with clear separation of concerns.
- Support multiple solving algorithms (backtracking, constraint propagation, Dancing Links / DLX).
- Offer a simple CLI and (optionally) GUI/web interface.
- Make testability and maintainability first-class.

## High-level Components
- Core model
  - Board: immutable/cloneable representation of a 9x9 Sudoku board (or configurable size), cell state, candidates.
  - Cell: value, fixed flag, candidate set.
- Parsers & Serializers
  - Input parsers for common Sudoku formats (string, CSV, text grids).
  - Exporters to same formats for saving/sharing puzzles and solutions.
- Generators
  - Puzzle generator that creates puzzles of varying difficulty by generating a full solution and removing numbers while ensuring uniqueness.
  - Difficulty heuristics layer (e.g., number of givens, techniques required to solve).
- Solvers
  - Backtracking solver: a straightforward depth-first search with heuristics (MRV, forward checking).
  - Constraint propagation: elimination, single-candidate, single-position, and other human-like techniques.
  - Dancing Links (DLX) implementation for exact-cover solving (optional advanced solver).
  - A unified Solver interface to run and time different algorithms and to return step traces for debugging/visualization.
- Interface layer
  - CLI: commands to solve, generate, validate, run benchmarks, and print boards.
  - GUI/Web (optional): visualization of board, step-by-step solving visualization.
- Utilities
  - Logging, configuration, random seed control for reproducible generations.
- Tests
  - Unit tests for core logic (board operations, solver steps), integration tests for full-solve flows, and property tests where appropriate.

## Suggested Directory Layout

- src/ or lib/
  - model/
    - board.*
    - cell.*
  - solvers/
    - backtracking.*
    - dlx.*
    - propagation.*
  - generator/
    - generator.*
    - difficulty.*
  - cli/
    - main.*
    - commands.*
  - utils/
    - io.*
    - logging.*
- tests/
  - unit/
  - integration/
- docs/
  - architecture.md
  - CONTRIBUTING.md

Adjust filenames/extensions based on the project's language.

## Data Flow
1. Input (CLI argument, file) -> Parser produces a Board object.
2. Board is passed to a Solver implementation.
3. Solver runs algorithms; it may emit a trace of steps and final solution.
4. Solution is serialized and output (stdout, file, GUI).

## Extension Points
- Solver interface: Add new solver implementations without touching CLI or model.
- Generator strategies: Swap difficulty estimators or number-removal heuristics.
- Board size: Parameterize board size to support 4x4, 16x16 with minimal code changes.

## Testing Strategy
- Core invariants: operations must preserve board validity (no duplicate numbers in row/col/block).
- Solver correctness: each solver must solve known puzzles and verify solutions against validators.
- Generator quality: generated puzzles should have unique solutions and meet claimed difficulty ranges.
- Performance tests: benchmark large sets of puzzles across solvers.

## CI & Quality
- Run unit and integration tests on every PR.
- Linting and formatting checks.
- Optional: coverage reporting and performance regression alerts.

## Contribution notes
- Keep changes small and focused; add tests for new functionality.
- Document algorithm choices in code and docs.

## Diagram suggestions
- Component diagram showing interactions: CLI -> Solver/Generator -> Model -> IO
- Sequence diagram for solving flow: parser -> solver -> trace -> serializer
