import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { formatCurrency } from '../../../lib/formatters';
import styles from './Charts.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
      tension?: number;
    }[];
  };
  title: string;
}

export const ChartLine = ({ data, title }: ChartProps) => {
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
            text: 'Fecha',
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
      <Line data={data} options={options} />
    </div>
  );
};