#!/usr/bin/env python3
"""
Performance Visualization for Healthcare Zero Trust System
Generates publication-ready charts for academic report
Works with summary-only data (no detailed CSV required)
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path
import sys

# Set style for academic papers
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 11
plt.rcParams['font.family'] = 'serif'

def load_data(summary_file):
    """Load benchmark results from CSV file"""
    print(f"📥 Loading data from: {summary_file}")
    summary = pd.read_csv(summary_file)
    
    # Validate required columns
    required_cols = ['Tier', 'Average', 'Median', 'P95', 'P99', 'Min', 'Max']
    missing_cols = [col for col in required_cols if col not in summary.columns]
    
    if missing_cols:
        print(f"❌ Error: Missing required columns: {missing_cols}")
        print(f"   Found columns: {summary.columns.tolist()}")
        sys.exit(1)
    
    print(f"✅ Loaded {len(summary)} tiers")
    return summary

def create_average_latency_comparison(summary, output_dir):
    """Create bar chart comparing average latency across tiers"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Define colors for each tier
    colors = ['#2ecc71', '#3498db', '#f39c12', '#e74c3c']
    tier_labels = ['Baseline', 'Zero Trust', 'Context-Aware', 'Privacy-Preserving']
    
    # Map tier names to labels
    tier_name_map = {
        'baseline': 'Baseline',
        'zeroTrust': 'Zero Trust',
        'contextAware': 'Context-Aware',
        'privacyPreserving': 'Privacy-Preserving'
    }
    
    # Create ordered data
    ordered_data = []
    for tier in ['baseline', 'zeroTrust', 'contextAware', 'privacyPreserving']:
        row = summary[summary['Tier'] == tier]
        if len(row) > 0:
            ordered_data.append(row['Average'].values[0])
        else:
            print(f"⚠️  Warning: Missing data for tier '{tier}'")
            ordered_data.append(0)
    
    bars = ax.bar(tier_labels, ordered_data, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        if height > 0:
            ax.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height:.1f}ms',
                    ha='center', va='bottom', fontweight='bold', fontsize=10)
    
    # Add overhead percentages
    baseline_avg = ordered_data[0] if ordered_data[0] > 0 else 1
    for i, (tier, avg) in enumerate(zip(tier_labels[1:], ordered_data[1:]), 1):
        if avg > 0:
            overhead = ((avg - baseline_avg) / baseline_avg) * 100
            ax.text(i, avg + max(ordered_data)*0.05, f'(+{overhead:.0f}%)', 
                    ha='center', va='bottom', color='red', fontsize=9, fontweight='bold')
    
    ax.set_ylabel('Average Latency (ms)', fontweight='bold', fontsize=12)
    ax.set_xlabel('Security Tier', fontweight='bold', fontsize=12)
    ax.set_title('Performance Impact of Security Layers\nHealthcare Zero Trust System', 
                 fontweight='bold', fontsize=14, pad=20)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_ylim(0, max(ordered_data) * 1.25)
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/avg_latency_comparison.png', dpi=300, bbox_inches='tight')
    plt.savefig(f'{output_dir}/avg_latency_comparison.pdf', bbox_inches='tight')
    print(f"✅ Generated: avg_latency_comparison.png")
    plt.close()

def create_percentile_comparison(summary, output_dir):
    """Create grouped bar chart for percentile comparison"""
    fig, ax = plt.subplots(figsize=(12, 6))
    
    tier_labels = ['Baseline', 'Zero Trust', 'Context-Aware', 'Privacy-Preserving']
    tier_order = ['baseline', 'zeroTrust', 'contextAware', 'privacyPreserving']
    
    x = np.arange(len(tier_labels))
    width = 0.2
    
    # Extract data in order
    medians = [summary[summary['Tier'] == t]['Median'].values[0] if len(summary[summary['Tier'] == t]) > 0 else 0 for t in tier_order]
    p95s = [summary[summary['Tier'] == t]['P95'].values[0] if len(summary[summary['Tier'] == t]) > 0 else 0 for t in tier_order]
    p99s = [summary[summary['Tier'] == t]['P99'].values[0] if len(summary[summary['Tier'] == t]) > 0 else 0 for t in tier_order]
    
    metrics = [
        ('Median', medians, '#3498db'),
        ('P95', p95s, '#f39c12'),
        ('P99', p99s, '#e74c3c')
    ]
    
    for i, (label, values, color) in enumerate(metrics):
        offset = (i - 1) * width
        bars = ax.bar(x + offset, values, width, label=label, color=color, alpha=0.8, edgecolor='black')
        
        # Add value labels
        for bar in bars:
            height = bar.get_height()
            if height > 0:
                ax.text(bar.get_x() + bar.get_width()/2., height,
                        f'{height:.1f}',
                        ha='center', va='bottom', fontsize=8)
    
    ax.set_ylabel('Latency (ms)', fontweight='bold', fontsize=12)
    ax.set_xlabel('Security Tier', fontweight='bold', fontsize=12)
    ax.set_title('Latency Distribution Across Security Tiers', fontweight='bold', fontsize=14, pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(tier_labels)
    ax.legend(title='Percentile', loc='upper left', fontsize=10)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/percentile_comparison.png', dpi=300, bbox_inches='tight')
    plt.savefig(f'{output_dir}/percentile_comparison.pdf', bbox_inches='tight')
    print(f"✅ Generated: percentile_comparison.png")
    plt.close()

def create_overhead_breakdown(summary, output_dir):
    """Create stacked bar chart showing overhead contribution"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    tier_order = ['baseline', 'zeroTrust', 'contextAware', 'privacyPreserving']
    avgs = [summary[summary['Tier'] == t]['Average'].values[0] if len(summary[summary['Tier'] == t]) > 0 else 0 for t in tier_order]
    
    baseline = avgs[0]
    zt_overhead = avgs[1] - baseline
    ca_change = avgs[2] - avgs[1]
    privacy_overhead = avgs[3] - avgs[2]
    
    categories = ['Zero Trust\nOverhead', 'Context-Aware\nChange', 'Privacy\nOverhead']
    values = [zt_overhead, ca_change, privacy_overhead]
    colors = ['#e74c3c', '#f39c12' if ca_change >= 0 else '#2ecc71', '#9b59b6']
    
    bars = ax.bar(categories, values, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)
    
    # Add baseline reference line
    ax.axhline(y=0, color='black', linestyle='--', linewidth=1.5, label=f'Baseline ({baseline:.1f}ms)')
    
    # Add value labels
    for bar, val in zip(bars, values):
        height = bar.get_height()
        label = f'{abs(val):.1f}ms'
        if val < 0:
            label = f'-{abs(val):.1f}ms'
            y_pos = height - abs(height)*0.1
        else:
            y_pos = height / 2
        
        ax.text(bar.get_x() + bar.get_width()/2., y_pos,
                label, ha='center', va='center', fontweight='bold', 
                color='white', fontsize=11,
                bbox=dict(boxstyle='round,pad=0.3', facecolor='black', alpha=0.7))
    
    ax.set_ylabel('Latency Change (ms)', fontweight='bold', fontsize=12)
    ax.set_title('Overhead Breakdown by Security Component', fontweight='bold', fontsize=14, pad=20)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.legend(loc='upper left')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/overhead_breakdown.png', dpi=300, bbox_inches='tight')
    plt.savefig(f'{output_dir}/overhead_breakdown.pdf', bbox_inches='tight')
    print(f"✅ Generated: overhead_breakdown.png")
    plt.close()

def create_throughput_comparison(summary, output_dir):
    """Create bar chart showing throughput (req/s)"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    tier_labels = ['Baseline', 'Zero Trust', 'Context-Aware', 'Privacy-Preserving']
    tier_order = ['baseline', 'zeroTrust', 'contextAware', 'privacyPreserving']
    colors = ['#2ecc71', '#3498db', '#f39c12', '#e74c3c']
    
    # Calculate throughput as 1000 / avg_latency (requests per second)
    avgs = [summary[summary['Tier'] == t]['Average'].values[0] if len(summary[summary['Tier'] == t]) > 0 else 0 for t in tier_order]
    throughput = [1000 / avg if avg > 0 else 0 for avg in avgs]
    
    bars = ax.bar(tier_labels, throughput, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)
    
    # Add value labels
    for bar in bars:
        height = bar.get_height()
        if height > 0:
            ax.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height:.1f}',
                    ha='center', va='bottom', fontweight='bold', fontsize=10)
    
    ax.set_ylabel('Throughput (requests/second)', fontweight='bold', fontsize=12)
    ax.set_xlabel('Security Tier', fontweight='bold', fontsize=12)
    ax.set_title('System Throughput Across Security Tiers', fontweight='bold', fontsize=14, pad=20)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_ylim(0, max(throughput) * 1.2)
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/throughput_comparison.png', dpi=300, bbox_inches='tight')
    plt.savefig(f'{output_dir}/throughput_comparison.pdf', bbox_inches='tight')
    print(f"✅ Generated: throughput_comparison.png")
    plt.close()

def create_min_max_range_plot(summary, output_dir):
    """Create plot showing min/max ranges"""
    fig, ax = plt.subplots(figsize=(12, 6))
    
    tier_labels = ['Baseline', 'Zero Trust', 'Context-Aware', 'Privacy-Preserving']
    tier_order = ['baseline', 'zeroTrust', 'contextAware', 'privacyPreserving']
    colors = ['#2ecc71', '#3498db', '#f39c12', '#e74c3c']
    
    x = np.arange(len(tier_labels))
    
    for i, (tier, color) in enumerate(zip(tier_order, colors)):
        row = summary[summary['Tier'] == tier]
        if len(row) > 0:
            avg = row['Average'].values[0]
            min_val = row['Min'].values[0]
            max_val = row['Max'].values[0]
            
            # Plot range as error bar
            ax.errorbar(i, avg, yerr=[[avg-min_val], [max_val-avg]], 
                       fmt='o', color=color, markersize=10, capsize=5, capthick=2,
                       linewidth=2, alpha=0.8, label=tier_labels[i])
    
    ax.set_xticks(x)
    ax.set_xticklabels(tier_labels)
    ax.set_ylabel('Latency (ms)', fontweight='bold', fontsize=12)
    ax.set_xlabel('Security Tier', fontweight='bold', fontsize=12)
    ax.set_title('Latency Range (Min, Average, Max)', fontweight='bold', fontsize=14, pad=20)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.legend(loc='upper left')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/latency_range.png', dpi=300, bbox_inches='tight')
    plt.savefig(f'{output_dir}/latency_range.pdf', bbox_inches='tight')
    print(f"✅ Generated: latency_range.png")
    plt.close()

def generate_summary_table(summary, output_dir):
    """Generate LaTeX table for report"""
    tier_order = ['baseline', 'zeroTrust', 'contextAware', 'privacyPreserving']
    tier_names = ['Baseline', 'Zero Trust', 'Context-Aware', 'Privacy-Preserving']
    
    latex_table = """\\begin{table}[h]
\\centering
\\caption{Performance Metrics Across Security Tiers}
\\label{tab:performance}
\\begin{tabular}{|l|r|r|r|r|r|}
\\hline
\\textbf{Tier} & \\textbf{Avg (ms)} & \\textbf{Median (ms)} & \\textbf{P95 (ms)} & \\textbf{P99 (ms)} & \\textbf{Overhead} \\\\
\\hline
"""
    
    baseline_avg = summary[summary['Tier'] == 'baseline']['Average'].values[0]
    
    for i, (tier, tier_name) in enumerate(zip(tier_order, tier_names)):
        row = summary[summary['Tier'] == tier]
        if len(row) > 0:
            avg = row['Average'].values[0]
            med = row['Median'].values[0]
            p95 = row['P95'].values[0]
            p99 = row['P99'].values[0]
            
            overhead = '---' if i == 0 else f"+{((avg - baseline_avg) / baseline_avg * 100):.1f}\\%"
            latex_table += f"{tier_name} & {avg:.2f} & {med:.2f} & {p95:.2f} & {p99:.2f} & {overhead} \\\\\n"
    
    latex_table += """\\hline
\\end{tabular}
\\end{table}
"""
    
    with open(f'{output_dir}/performance_table.tex', 'w') as f:
        f.write(latex_table)
    
    print(f"✅ Generated: performance_table.tex (LaTeX)")

def main():
    """Main visualization pipeline"""
    if len(sys.argv) < 2:
        print("Usage: python visualize.py <benchmark_results.csv>")
        print("\nSearching for CSV files in current directory...")
        csv_files = list(Path('.').glob('benchmark_results_*.csv'))
        if not csv_files:
            print("❌ No benchmark CSV files found!")
            sys.exit(1)
        summary_file = str(sorted(csv_files)[-1])
        print(f"✅ Using: {summary_file}")
    else:
        summary_file = sys.argv[1]
    
    print(f"\n📊 Healthcare Zero Trust Performance Visualization")
    print(f"Summary file: {summary_file}")
    
    # Load data
    print("\n📥 Loading data...")
    summary = load_data(summary_file)
    
    # Create output directory
    output_dir = Path('visualizations')
    output_dir.mkdir(exist_ok=True)
    print(f"\n📁 Saving visualizations to: {output_dir}/")
    
    # Generate all visualizations
    print("\n🎨 Generating visualizations...")
    create_average_latency_comparison(summary, output_dir)
    create_percentile_comparison(summary, output_dir)
    create_overhead_breakdown(summary, output_dir)
    create_throughput_comparison(summary, output_dir)
    create_min_max_range_plot(summary, output_dir)
    generate_summary_table(summary, output_dir)
    
    print(f"\n✅ All visualizations generated successfully!")
    print(f"\n📁 Files available in: {output_dir}/")
    print(f"   - PNG files (for reports/presentations)")
    print(f"   - PDF files (high-quality vector graphics)")
    print(f"   - LaTeX table (for academic papers)")
    
    # Print summary statistics
    print("\n📊 Summary Statistics:")
    print("=" * 70)
    
    tier_order = ['baseline', 'zeroTrust', 'contextAware', 'privacyPreserving']
    tier_names = ['Baseline', 'Zero Trust', 'Context-Aware', 'Privacy-Preserving']
    
    baseline_avg = summary[summary['Tier'] == 'baseline']['Average'].values[0]
    
    for tier, tier_name in zip(tier_order, tier_names):
        row = summary[summary['Tier'] == tier]
        if len(row) > 0:
            avg = row['Average'].values[0]
            overhead = 0 if tier == 'baseline' else ((avg - baseline_avg) / baseline_avg * 100)
            print(f"{tier_name:20s}: {avg:6.2f}ms avg  (overhead: {overhead:+5.1f}%)")
    
    print("=" * 70)

if __name__ == '__main__':
    main()