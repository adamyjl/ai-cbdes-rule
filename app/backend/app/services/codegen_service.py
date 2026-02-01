from __future__ import annotations

from dataclasses import dataclass


@dataclass
class CodegenService:
    def plan(self, task_id: str, requirement: str) -> str:
        return "".join(
            [
                f"# 编排计划草案\n\n",
                f"- task_id: {task_id}\n",
                f"- 需求摘要: {requirement[:200]}\n\n",
                "## 步骤\n",
                "1. 检索并复用既有函数（TopK + 相似档案）\n",
                "2. 生成最小胶水代码（严格白名单目录）\n",
                "3. 生成单测与门禁命令\n",
            ]
        )

    def generate(self, task_id: str, plan_markdown: str) -> str:
        _ = (task_id, plan_markdown)
        return "".join(
            [
                "diff --git a/demo.txt b/demo.txt\n",
                "new file mode 100644\n",
                "index 0000000..e69de29\n",
            ]
        )

