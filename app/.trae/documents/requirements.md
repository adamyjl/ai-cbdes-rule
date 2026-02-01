# AI-CBDES-Rule Requirements Document

## 1. Project Overview

**Project Name:** AI-CBDES-Rule
**Goal:** Evolve intelligent driving software development from manual coding to an intelligent closed-loop production line. Enable engineers to focus on logic design while AI handles code implementation.
**Core:** AI Core (Code Agent) responsible for rule-based code generation and invocation.

## 2. Core Modules

### 2.1 Offline Capability Evolution

Focus on building the knowledge base and model capabilities.

#### 2.1.1 RAG Management Page

* **Local Directory Scanning:** Automatically scan `cpp`, `h`, and `python` files in a specified local directory.

* **Function Processing:** Split code by function.

* **AI Processing:** Use LLMs (GLM, Codex, etc.) to name, classify, and archive functions.

* **Module Classification:** Categorize into Common, Perception, Planning, Decision, Localization, Control, etc.

* **UI:** Graphical interface for rapid positioning, viewing, modification, and testing of functions.

* **Indexing:** Index all functions and their Chinese descriptions into a RAG database with similarity search.

#### 2.1.2 Archive Management Page

* **Activity Logging:** Record all agent behaviors (code loading, RAG updates, Q\&A, module building).

* **Playback:** View historical actions and states.

#### 2.1.3 SFT Evolution Page

* **Workflow:** Define workflow for fine-tuning/RL on existing codebases (implementation deferred, UI visualization only).

### 2.2 Online Code Production Line

The main workflow for generating and delivering code.

#### 2.2.1 Task Input Page

* **Input Methods:**

  * Drag-and-drop existing functions from archives.

  * Natural language description.

* **Structured Form:**

  * Target Module (Common/Perception/Planning/etc.)

  * Intent Type (New/Fix/Refactor/Adapt/Performance)

  * Contracts (Topic/Struct/Frequency/Frame)

  * Engineering Boundaries (Whitelist directories, No new deps)

  * Delivery Requirements (Function priority, Gate pass, Diff+Test+Report)

* **Real-time Feedback:** Generate "Demand Card", "Acceptance Conditions", "KPI Thresholds".

* **Gap Analysis:** Pre-generate list of missing info (params, versions, strategies).

#### 2.2.2 CoT Routing & QA Disambiguation Page

* **Routing Decision:** System decomposes task and selects path (Reuse vs Glue Code).

* **Explanation:** Show basis (TopK functions, risk assessment).

* **QA Disambiguation:** Interactive Q\&A to fill gaps (fields, units, threads, coords).

* **Output:** Function Orchestration Plan Draft.

#### 2.2.3 Function Orchestration & Code Generation Page

* **Visualization:** Light DAG/Step flow showing the orchestration link.

* **Editing:** Replace nodes, lock versions.

* **Generation:** Display File Tree, Patch Diff, Key Code Snippets.

* **Explanation:** Source explanation (why this function, why glue code).

* **Constraints:** Switches for "Glue only", "Whitelist only".

* **Action:** Manual review -> Enter Test Gate.

#### 2.2.4 Detection & Test Gate Page

* **Gates:** Compile, Static Check, Unit Test, Coverage (Optional: Replay/Sim).

* **Execution:** Pipeline view with real-time status/logs.

* **Failure Handling:** Auto-rollback strategy (revert/withdraw) + Repair suggestions.

* **Success:** Structured Test Report + Evidence Chain.

#### 2.2.5 Task End & Release Page

* **Release:** Generate Version #, Change Summary (Impact, Risk, Rollback).

* **Deliverables:** Patch, File List, API Docs, Test Info, Scripts.

* **Evidence:** Full package of routing, RAG, QA, Plan, Logs.

* **Asset Management:** Publish to Module Asset Library.

## 3. Non-Functional Requirements

* **Performance:** Quick indexing and retrieval.

* **Reliability:** Rollback mechanisms are critical.

* **Traceability:** Full evidence chain for all generated code.

