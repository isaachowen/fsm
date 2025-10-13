# Architecture Documentation Generator Prompt

**Objective**: Generate a comprehensive, up-to-date architecture summary document that provides both high-level conceptual understanding and detailed technical implementation insights for the project.

## Analysis Requirements

Examine the entire repository structure at `[PROJECT_ROOT_PATH]` including:
- Current `[EXISTING_ARCHITECTURE_FILE_PATH]` file as baseline
- All source files in `[SOURCE_DIRECTORY]` and their interdependencies  
- Build system and web interface files in `[BUILT_APP_DIRECTORY]`
- Project file tree is `[PROJECT_FILE_TREE]`

## Document Structure

Create a timestamped document: `architecture_context_summary_YYYY-MM-DD.md`

**Table of Contents:**
1. **Project Overview & Browser Execution Model**
2. **High-Level System Architecture**
3. **Component Relationships & Data Flow**
4. **Detailed Implementation Analysis**
   - 4.1 Core Application Controller
   - 4.2 Element Class System
   - 4.3 Export Strategy Pattern
   - 4.4 Event Handling & State Management
   - 4.5 Mathematical & Geometric Foundations
5. **Technical Infrastructure**
   - 5.1 Build & Deployment Pipeline
   - 5.2 File-by-File Implementation Guide
6. **Development Workflow & Extension Points**

## Content Focus

**High-Level Sections:**
- How the browser loads and executes this vanilla JavaScript application
- User interaction flow from browser perspective
- Canvas API enabling real-time drawing and manipulation
- Relationship between HTML, JavaScript modules, and browser APIs
- Function call hierarchy diagrams showing nested call stacks and execution trees/DAGs

**Detailed Sections:**
- Component architecture and design patterns
- Data structures and state management
- Event handling pipeline and user interaction flow
- Mathematical algorithms for geometric calculations
- Export system strategy pattern implementation
- Build process and file concatenation mechanics

## Key Questions to Address

- How does the browser's Canvas API enable this FSM drawing application?
- What is the execution flow from user input to visual feedback?
- How do the modular source files work together when concatenated?
- What design patterns make the export system extensible?
- How does the persistence system work with browser localStorage?
- What mathematical foundations enable the geometric calculations?

## Output Requirements

- Use Mermaid diagrams for architectural relationships
- Include code snippets for key design patterns
- Ensure readability for both AI agents and human developers
- Document extension points for new features
- Clarify this is browser-only, client-side (no external APIs)
- **Note any unexpected structure or design patterns** encountered in the repository that differ from typical conventions or require special explanation

Generate a comprehensive architecture document that captures the current state of the codebase and serves as the definitive reference for understanding and extending this project.