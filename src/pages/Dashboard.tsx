import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
}

interface Holding {
  id: string;
  symbol: string;
  shares: number;
  average_price: number;
  current_price?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    shares: '',
    average_price: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPortfolios();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPortfolio) {
      fetchHoldings();
    }
  }, [selectedPortfolio]);

  const createDefaultPortfolio = async () => {
    const { data, error } = await supabase
      .from('portfolios')
      .insert([{
        user_id: user!.id,
        name: 'My Portfolio'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating default portfolio:', error);
      return null;
    }

    return data;
  };

  const fetchPortfolios = async () => {
    try {
      let { data: portfolios, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;

      if (!portfolios || portfolios.length === 0) {
        const defaultPortfolio = await createDefaultPortfolio();
        if (defaultPortfolio) {
          portfolios = [defaultPortfolio];
        }
      }

      setPortfolios(portfolios || []);
      if (portfolios && portfolios.length > 0) {
        setSelectedPortfolio(portfolios[0].id);
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHoldings = async () => {
    if (!selectedPortfolio) return;

    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .eq('portfolio_id', selectedPortfolio);

    if (error) {
      console.error('Error fetching holdings:', error);
      return;
    }

    // Simulate real-time prices (in a real app, you'd fetch from a stock API)
    const holdingsWithPrices = data.map(holding => ({
      ...holding,
      current_price: holding.average_price * (0.8 + Math.random() * 0.4) // Random price ±20%
    }));

    setHoldings(holdingsWithPrices);
  };

  const addHolding = async () => {
    if (!selectedPortfolio || !newHolding.symbol || !newHolding.shares || !newHolding.average_price) {
      console.error('Missing required fields');
      return;
    }

    const { error } = await supabase
      .from('holdings')
      .insert([{
        portfolio_id: selectedPortfolio,
        symbol: newHolding.symbol.toUpperCase(),
        shares: parseFloat(newHolding.shares),
        average_price: parseFloat(newHolding.average_price)
      }]);

    if (error) {
      console.error('Error adding holding:', error);
      return;
    }

    setShowAddHolding(false);
    setNewHolding({ symbol: '', shares: '', average_price: '' });
    fetchHoldings();
  };

  const deleteHolding = async (id: string) => {
    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting holding:', error);
      return;
    }

    fetchHoldings();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  const totalValue = holdings.reduce((sum, holding) => 
    sum + (holding.shares * (holding.current_price || holding.average_price)), 0
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const pieData = holdings.map(holding => ({
    name: holding.symbol,
    value: holding.shares * (holding.current_price || holding.average_price)
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Portfolio Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900">Total Value</h3>
            <p className="text-3xl font-bold text-blue-600">
              ${totalValue.toFixed(2)}
            </p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-green-900">Holdings</h3>
            <p className="text-3xl font-bold text-green-600">{holdings.length}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-purple-900">Top Performer</h3>
            <p className="text-3xl font-bold text-purple-600">
              {holdings.length > 0 
                ? holdings.reduce((max, holding) => 
                    ((holding.current_price || holding.average_price) / holding.average_price > 
                    (max.current_price || max.average_price) / max.average_price) ? holding : max
                  ).symbol
                : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Portfolio Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Holdings</h3>
            <button
              onClick={() => setShowAddHolding(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Holding
            </button>
          </div>

          {showAddHolding && (
            <div className="mb-4 p-4 border rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Symbol"
                  value={newHolding.symbol}
                  onChange={(e) => setNewHolding({ ...newHolding, symbol: e.target.value })}
                  className="rounded-md border-gray-300"
                />
                <input
                  type="number"
                  placeholder="Shares"
                  value={newHolding.shares}
                  onChange={(e) => setNewHolding({ ...newHolding, shares: e.target.value })}
                  className="rounded-md border-gray-300"
                />
                <input
                  type="number"
                  placeholder="Avg Price"
                  value={newHolding.average_price}
                  onChange={(e) => setNewHolding({ ...newHolding, average_price: e.target.value })}
                  className="rounded-md border-gray-300"
                />
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddHolding(false)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addHolding}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holdings.map((holding) => (
                  <tr key={holding.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{holding.symbol}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holding.shares}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${holding.average_price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(holding.current_price || holding.average_price).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(holding.shares * (holding.current_price || holding.average_price)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => deleteHolding(holding.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}