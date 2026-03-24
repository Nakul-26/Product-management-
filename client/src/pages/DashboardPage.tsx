import { useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { DailySalesSummary, Dashboard, ProfitSummary } from '../types';

type RevenuePoint = {
  day: string;
  revenue: number;
};

const dayName = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'short' });

const defaultProfitSummary: ProfitSummary = {
  range: { from: null, to: null },
  totalRevenue: 0,
  totalCOGS: 0,
  totalProfit: 0,
  totalExpenses: 0,
  netProfit: 0,
  avgMargin: 0,
  topProfitableProducts: []
};

function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [profit, setProfit] = useState<ProfitSummary>(defaultProfitSummary);
  const [chartData, setChartData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [dashboardRes, profitRes] = await Promise.all([
          api.get<Dashboard>('/dashboard'),
          api.get<ProfitSummary>('/analytics/profit')
        ]);

        const days = Array.from({ length: 7 }).map((_, index) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - index));
          return date;
        });

        const summaries = await Promise.all(
          days.map(async (date) => {
            const dateParam = date.toISOString().slice(0, 10);
            try {
              const summaryRes = await api.get<DailySalesSummary>('/sales/summary/daily', { params: { date: dateParam } });
              return {
                day: dayName(date),
                revenue: summaryRes.data.totalSales || 0
              };
            } catch {
              return {
                day: dayName(date),
                revenue: 0
              };
            }
          })
        );

        setData(dashboardRes.data);
        setProfit(profitRes.data);
        setChartData(summaries);
      } catch {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const maxRevenue = useMemo(() => Math.max(...chartData.map((item) => item.revenue), 1), [chartData]);

  return (
    <main className="app">
      <div className="dashboard-container">
        <h2>Dashboard</h2>

        {loading && <p>Loading...</p>}
        {error && <p className="error-text">{error}</p>}

        {data && (
          <>
            <div className="dashboard-cards">
              <div className="card">
                <h3>Total Products</h3>
                <p>{data.products}</p>
              </div>

              <div className="card">
                <h3>Low Stock</h3>
                <p>{data.lowStock}</p>
              </div>

              <div className="card">
                <h3>Pending Payments</h3>
                <p>₹ {data.pendingPaymentsAmount.toFixed(2)}</p>
              </div>

              <div className="card">
                <h3>Pending Deliveries</h3>
                <p>{data.pendingDeliveries}</p>
              </div>
            </div>

            <h3 className="section-title">Financial Overview</h3>
            <div className="dashboard-cards financial-cards">
              <div className="card">
                <h3>Gross Revenue</h3>
                <p>₹ {profit.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="card">
                <h3>COGS</h3>
                <p>₹ {profit.totalCOGS.toFixed(2)}</p>
              </div>
              <div className="card">
                <h3>Gross Profit</h3>
                <p>₹ {profit.totalProfit.toFixed(2)}</p>
              </div>
              <div className="card">
                <h3>Expenses</h3>
                <p>₹ {profit.totalExpenses.toFixed(2)}</p>
              </div>
              <div className="card">
                <h3>Net Profit</h3>
                <p>₹ {profit.netProfit.toFixed(2)}</p>
              </div>
              <div className="card">
                <h3>Margin %</h3>
                <p>{profit.avgMargin.toFixed(2)}%</p>
              </div>
            </div>

            <div className="chart-section">
              <h3>Revenue (Last 7 Days)</h3>
              <div className="mini-chart">
                {chartData.map((point) => (
                  <div key={point.day} className="mini-chart-col">
                    <div className="mini-chart-value">₹{point.revenue.toFixed(0)}</div>
                    <div
                      className="mini-chart-bar"
                      style={{ height: `${Math.max((point.revenue / maxRevenue) * 180, 8)}px` }}
                      title={`${point.day}: ₹${point.revenue.toFixed(2)}`}
                    />
                    <div className="mini-chart-label">{point.day}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-section">
              <h3>Top Profitable Products</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                    <th>COGS</th>
                    <th>Profit</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {profit.topProfitableProducts.length === 0 ? (
                    <tr><td colSpan={6} className="muted">No profit data yet.</td></tr>
                  ) : (
                    profit.topProfitableProducts.map((product) => (
                      <tr key={product.productId}>
                        <td>{product.productName} {product.sku ? `(${product.sku})` : ''}</td>
                        <td>{product.totalQuantity}</td>
                        <td>₹{product.totalRevenue.toFixed(2)}</td>
                        <td>₹{product.totalCOGS.toFixed(2)}</td>
                        <td>₹{product.totalProfit.toFixed(2)}</td>
                        <td>{product.margin.toFixed(2)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default DashboardPage;
