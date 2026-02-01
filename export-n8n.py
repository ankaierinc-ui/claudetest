#!/usr/bin/env python3

"""
n8n Cloud Run 一键导出工具
从Google Cloud Run的n8n实例导出所有工作流、凭证和变量
"""

import os
import sys
import json
import requests
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import time

class N8NExporter:
    def __init__(self, base_url: str, api_key: str, output_dir: Optional[str] = None):
        """初始化导出器"""
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            'X-N8N-API-KEY': api_key,
            'Content-Type': 'application/json'
        }

        # 创建输出目录
        if output_dir is None:
            output_dir = f"./n8n-export-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # 统计数据
        self.stats = {
            'workflows': 0,
            'credentials': 0,
            'variables': 0,
            'errors': []
        }

        self.log_file = self.output_dir / 'export.log'

    def log(self, message: str, level: str = 'INFO'):
        """记录日志"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] [{level}] {message}"

        print(log_message)

        with open(self.log_file, 'a') as f:
            f.write(log_message + '\n')

    def test_connection(self) -> bool:
        """测试n8n连接"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/workflows?limit=1",
                headers=self.headers,
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            self.log(f"连接失败: {e}", 'ERROR')
            return False

    def export_workflows(self) -> bool:
        """导出所有工作流"""
        self.log("开始导出工作流...")

        try:
            # 获取工作流列表
            response = requests.get(
                f"{self.base_url}/api/v1/workflows?limit=1000",
                headers=self.headers
            )
            response.raise_for_status()

            workflows = response.json()

            # 保存完整列表
            workflows_file = self.output_dir / 'workflows.json'
            with open(workflows_file, 'w') as f:
                json.dump(workflows, f, indent=2)

            self.stats['workflows'] = len(workflows.get('data', []))
            self.log(f"导出 {self.stats['workflows']} 个工作流")

            # 导出详细信息
            details_dir = self.output_dir / 'workflows-detailed'
            details_dir.mkdir(exist_ok=True)

            for idx, workflow in enumerate(workflows.get('data', []), 1):
                workflow_id = workflow['id']
                try:
                    detail_response = requests.get(
                        f"{self.base_url}/api/v1/workflows/{workflow_id}",
                        headers=self.headers
                    )
                    detail_response.raise_for_status()

                    detail_file = details_dir / f"workflow-{workflow_id}.json"
                    with open(detail_file, 'w') as f:
                        json.dump(detail_response.json(), f, indent=2)

                    print(f"\r  已导出: {idx}/{self.stats['workflows']}", end='', flush=True)
                except Exception as e:
                    self.log(f"导出工作流 {workflow_id} 失败: {e}", 'WARNING')
                    self.stats['errors'].append(f"workflow-{workflow_id}: {e}")

            print()  # 换行
            self.log("工作流导出完成")
            return True

        except Exception as e:
            self.log(f"导出工作流失败: {e}", 'ERROR')
            self.stats['errors'].append(f"workflows: {e}")
            return False

    def export_credentials(self) -> bool:
        """导出所有凭证"""
        self.log("开始导出凭证...")

        try:
            response = requests.get(
                f"{self.base_url}/api/v1/credentials?limit=1000",
                headers=self.headers
            )
            response.raise_for_status()

            credentials = response.json()

            # 保存完整列表
            credentials_file = self.output_dir / 'credentials.json'
            with open(credentials_file, 'w') as f:
                json.dump(credentials, f, indent=2)

            self.stats['credentials'] = len(credentials.get('data', []))
            self.log(f"导出 {self.stats['credentials']} 个凭证")

            # 生成凭证清单（不含敏感信息）
            credentials_list_file = self.output_dir / 'credentials-list.txt'
            with open(credentials_list_file, 'w') as f:
                f.write(f"n8n 凭证清单 - {datetime.now()}\n")
                f.write("=" * 50 + "\n\n")

                for cred in credentials.get('data', []):
                    f.write(f"{cred.get('name', 'Unknown')} ({cred.get('type', 'Unknown')})\n")

            self.log("凭证导出完成")
            return True

        except Exception as e:
            self.log(f"导出凭证失败: {e}", 'ERROR')
            self.stats['errors'].append(f"credentials: {e}")
            return False

    def export_variables(self) -> bool:
        """导出全局变量"""
        self.log("开始导出变量...")

        try:
            response = requests.get(
                f"{self.base_url}/api/v1/variables",
                headers=self.headers,
                timeout=10
            )

            if response.status_code == 404:
                self.log("变量端点不可用（可能是旧版本）", 'WARNING')
                return True

            response.raise_for_status()

            variables = response.json()

            variables_file = self.output_dir / 'variables.json'
            with open(variables_file, 'w') as f:
                json.dump(variables, f, indent=2)

            self.stats['variables'] = len(variables.get('data', []))
            self.log(f"导出 {self.stats['variables']} 个变量")

            return True

        except Exception as e:
            self.log(f"导出变量失败: {e}", 'WARNING')
            return True  # 不算失败，因为旧版本可能没有这个API

    def generate_report(self):
        """生成导出报告"""
        self.log("生成导出报告...")

        report_file = self.output_dir / 'EXPORT_REPORT.md'

        with open(report_file, 'w') as f:
            f.write("# n8n 导出报告\n\n")
            f.write(f"**导出时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**导出来源**: {self.base_url}\n")
            f.write(f"**输出目录**: {self.output_dir}\n\n")

            f.write("## 导出统计\n\n")
            f.write(f"- **工作流数量**: {self.stats['workflows']}\n")
            f.write(f"- **凭证数量**: {self.stats['credentials']}\n")
            f.write(f"- **变量数量**: {self.stats['variables']}\n")

            if self.stats['errors']:
                f.write(f"- **错误数量**: {len(self.stats['errors'])}\n\n")
                f.write("## 错误日志\n\n")
                for error in self.stats['errors']:
                    f.write(f"- {error}\n")
                f.write("\n")

            f.write("## 文件清单\n\n")
            f.write("### 工作流\n")
            f.write("- `workflows.json` - 所有工作流列表\n")
            f.write("- `workflows-detailed/` - 每个工作流的详细定义\n\n")

            f.write("### 凭证\n")
            f.write("- `credentials.json` - 所有凭证信息\n")
            f.write("- `credentials-list.txt` - 凭证清单\n\n")

            f.write("### 其他\n")
            f.write("- `variables.json` - 全局变量\n")
            f.write("- `export.log` - 导出日志\n\n")

            f.write("## 安全提示\n\n")
            f.write("⚠️ **重要**:\n")
            f.write("- 凭证文件中可能包含敏感信息，请妥善保管\n")
            f.write("- 不要将此目录提交到公开的git仓库\n")
            f.write("- 考虑加密敏感文件\n\n")

            f.write("## 恢复说明\n\n")
            f.write("要在另一个n8n实例中恢复工作流：\n\n")
            f.write("1. 登录目标n8n实例\n")
            f.write("2. 转到Settings → Data Management\n")
            f.write("3. 点击Import\n")
            f.write("4. 选择此目录中的JSON文件\n\n")

    def run(self) -> bool:
        """执行完整导出"""
        self.log("=" * 50)
        self.log("n8n 导出工具启动")
        self.log("=" * 50)

        self.log(f"目标URL: {self.base_url}")
        self.log(f"输出目录: {self.output_dir}")

        # 测试连接
        self.log("测试连接...")
        if not self.test_connection():
            self.log("无法连接到n8n实例，请检查URL和API密钥", 'ERROR')
            return False
        self.log("连接成功")

        # 导出各项内容
        self.export_workflows()
        self.export_credentials()
        self.export_variables()

        # 生成报告
        self.generate_report()

        # 最终总结
        self.log("=" * 50)
        self.log("导出完成")
        self.log("=" * 50)
        self.log(f"工作流: {self.stats['workflows']}")
        self.log(f"凭证: {self.stats['credentials']}")
        self.log(f"变量: {self.stats['variables']}")
        self.log(f"错误: {len(self.stats['errors'])}")

        return True


def main():
    parser = argparse.ArgumentParser(
        description='从n8n实例导出工作流和凭证'
    )

    parser.add_argument(
        'url',
        help='n8n实例URL (如: https://my-n8n.run.app)'
    )

    parser.add_argument(
        'api_key',
        help='n8n API密钥 (从Settings → API获取)'
    )

    parser.add_argument(
        '-o', '--output',
        default=None,
        help='输出目录 (默认: ./n8n-export-TIMESTAMP)'
    )

    args = parser.parse_args()

    # 创建导出器并执行
    exporter = N8NExporter(args.url, args.api_key, args.output)

    success = exporter.run()

    # 打印最终信息
    print("\n" + "=" * 50)
    if success:
        print("✓ 导出成功！")
        print(f"输出目录: {exporter.output_dir}")
        print(f"查看报告: cat {exporter.output_dir}/EXPORT_REPORT.md")
    else:
        print("✗ 导出失败，请检查日志")
        print(f"日志文件: {exporter.log_file}")
    print("=" * 50)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
