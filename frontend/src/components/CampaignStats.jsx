import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import '../styles/Charts.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function CampaignStats({ stats }) {
  if (!stats) {
    return <div className="empty-state">No statistics available yet</div>;
  }

  // Prepare chart data
  const statusData = {
    labels: ['Sent', 'Delivered', 'Read', 'Failed'],
    datasets: [
      {
        label: 'Messages',
        data: [
          stats.total_messages || 0,
          stats.delivered || 0,
          stats.read_count || 0,
          (stats.total_messages || 0) - (stats.delivered || 0),
        ],
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(76, 175, 80, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(244, 67, 54, 0.8)',
        ],
        borderColor: [
          'rgba(102, 126, 234, 1)',
          'rgba(76, 175, 80, 1)',
          'rgba(33, 150, 243, 1)',
          'rgba(244, 67, 54, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const rateData = {
    labels: ['Delivery Rate', 'Read Rate'],
    datasets: [
      {
        label: 'Percentage (%)',
        data: [
          stats.total_messages > 0 ? ((stats.delivered / stats.total_messages) * 100).toFixed(1) : 0,
          stats.total_messages > 0 ? ((stats.read_count / stats.total_messages) * 100).toFixed(1) : 0,
        ],
        backgroundColor: [
          'rgba(76, 175, 80, 0.8)',
          'rgba(33, 150, 243, 0.8)',
        ],
        borderColor: [
          'rgba(76, 175, 80, 1)',
          'rgba(33, 150, 243, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div className="stats-container">
      <div className="stats-grid">
        {/* Summary Cards */}
        <div className="stat-card">
          <p className="stat-label">Total Messages</p>
          <p className="stat-value">{stats.total_messages || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Delivered</p>
          <p className="stat-value">{stats.delivered || 0}</p>
          <p className="stat-percent">
            {stats.total_messages > 0 ? ((stats.delivered / stats.total_messages) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Read</p>
          <p className="stat-value">{stats.read_count || 0}</p>
          <p className="stat-percent">
            {stats.total_messages > 0 ? ((stats.read_count / stats.total_messages) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Failed</p>
          <p className="stat-value">
            {(stats.total_messages || 0) - (stats.delivered || 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-container">
          <h4>Message Status Distribution</h4>
          <Pie data={statusData} options={chartOptions} />
        </div>
        <div className="chart-container">
          <h4>Performance Rates</h4>
          <Bar data={rateData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

export default CampaignStats;
