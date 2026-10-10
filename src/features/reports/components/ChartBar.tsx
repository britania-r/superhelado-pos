// src/features/reports/components/ChartBar.tsx

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { formatCurrency } from '../../../lib/formatters';
import styles from './Charts.module.css';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }[];
  };
  title: string;
}

export const ChartBar = ({ data, title }: ChartProps) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 18, weight: 'bold' },
        color: 'var(--color-text-primary)'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      },
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
            display: true,
            text: 'Ventas (S/)',
            color: 'var(--color-text-secondary)'
        },
        ticks: {
            callback: function(value: any) {
                return formatCurrency(value);
            },
            color: 'var(--color-text-secondary)'
        },
        grid: {
            color: 'var(--color-border)'
        }
      },
      x: {
        title: {
            display: true,
            text: 'Ítem',
            color: 'var(--color-text-secondary)'
        },
        ticks: {
            color: 'var(--color-text-secondary)'
        },
        grid: {
            color: 'var(--color-border)'
        }
      }
    }
  };

  return (
    <div className={styles.chartWrapper}>
      <Bar data={data} options={options} />
    </div>
  );
};