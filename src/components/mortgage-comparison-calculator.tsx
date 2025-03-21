import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Add type definition for scenario state
type ScenarioState = {
  purchasePrice: number;
  downPayment: number;
  downPaymentType: string;
  interestRate: number;
  amortizationPeriod: number;
  term: number;
  paymentFrequency: string;
  extraPayment: number;
  paymentIncrease: number;
  annualPrepayment: number;
  [key: string]: number | string; // Index signature
};

interface AmortizationItem {
  year: number;
  principalPaid: number;
  interestPaid: number;
  extraPayments: number;
  endingBalance: number;
}

interface MortgageResult {
  monthlyPayment: number;
  totalMortgage: number;
  totalInterestTerm: number;
  totalInterestLifetime: number;
  balanceAtEndOfTerm: number;
  effectiveAmortization: number;
  amortizationSchedule: AmortizationItem[];
}

export interface Comparison {
  scenarioA: MortgageResult;
  scenarioB: MortgageResult;
}

const MortgageComparisonCalculator = () => {
  // Constants
  const PAYMENT_FREQUENCIES = [
    { value: 'monthly', label: 'Monthly', paymentsPerYear: 12 },
    { value: 'biweekly', label: 'Bi-Weekly', paymentsPerYear: 26 },
    { value: 'accelerated_biweekly', label: 'Accelerated Bi-Weekly', paymentsPerYear: 26 },
    { value: 'weekly', label: 'Weekly', paymentsPerYear: 52 },
    { value: 'accelerated_weekly', label: 'Accelerated Weekly', paymentsPerYear: 52 }
  ];

  const AMORTIZATION_PERIODS = Array.from({ length: 26 }, (_, i) => i + 5)
    .filter(year => year <= 30)
    .map(year => ({ value: year, label: `${year} Years` }));

  const TERM_LENGTHS = Array.from({ length: 10 }, (_, i) => i + 1)
    .map(year => ({ value: year, label: `${year} Year${year > 1 ? 's' : ''}` }));

  // State for both scenarios
  const [scenarioA, setScenarioA] = useState<ScenarioState>({
    purchasePrice: 500000,
    downPayment: 100000,
    downPaymentType: 'amount',
    interestRate: 5.5,
    amortizationPeriod: 25,
    term: 5,
    paymentFrequency: 'monthly',
    extraPayment: 0,
    paymentIncrease: 0,
    annualPrepayment: 0
  });

  const [scenarioB, setScenarioB] = useState<ScenarioState>({
    purchasePrice: 500000,
    downPayment: 100000,
    downPaymentType: 'amount',
    interestRate: 4.5,
    amortizationPeriod: 25,
    term: 5,
    paymentFrequency: 'accelerated_biweekly',
    extraPayment: 200,
    paymentIncrease: 0,
    annualPrepayment: 0
  });

  // State for comparison results
  const [comparison, setComparison] = useState<{
    scenarioA: MortgageResult;
    scenarioB: MortgageResult;
    differences: {
      monthlyPayment: number;
      totalInterestTerm: number;
      totalInterestLifetime: number;
      balanceAtEndOfTerm: number;
      timeShaved: number;
    };
  }>({
    scenarioA: {
      monthlyPayment: 0,
      totalMortgage: 0,
      totalInterestTerm: 0,
      totalInterestLifetime: 0,
      balanceAtEndOfTerm: 0,
      effectiveAmortization: 0,
      amortizationSchedule: [] as AmortizationItem[]
    },
    scenarioB: {
      monthlyPayment: 0,
      totalMortgage: 0,
      totalInterestTerm: 0,
      totalInterestLifetime: 0,
      balanceAtEndOfTerm: 0,
      effectiveAmortization: 0,
      amortizationSchedule: [] as AmortizationItem[]
    },
    differences: {
      monthlyPayment: 0,
      totalInterestTerm: 0,
      totalInterestLifetime: 0,
      balanceAtEndOfTerm: 0,
      timeShaved: 0
    }
  });

  const [activeTab, setActiveTab] = useState('input');

  // Utility functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
  };

  // Handle input changes for Scenario A
  const handleScenarioAChange = (name: keyof ScenarioState, value: string | number) => {
    // Handle empty string
    if (value === '') {
      setScenarioA(prev => ({ ...prev, [name]: '' }));
      return;
    }
    
    // For numeric fields
    if (typeof scenarioA[name] === 'number') {
      // Convert to number and prevent leading zeros
      const numericValue = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : String(value);
      value = Number(numericValue);
    }
    
    const updatedInputs = { ...scenarioA, [name]: value };
  
    // Update related values
    if (name === 'purchasePrice' && scenarioA.downPaymentType === 'percent') {
      const purchasePrice = typeof value === 'number' ? value : 0;
      const downPaymentPercent = typeof scenarioA.downPayment === 'number' ? scenarioA.downPayment : 0;
      updatedInputs.downPayment = Math.round(purchasePrice * (downPaymentPercent / 100) / 100) * 100;
    } else if (name === 'downPayment') {
      if (scenarioA.downPaymentType === 'percent') {
        const numValue = Number(value);
        if (numValue > 100) value = 100;
        updatedInputs.downPayment = Number(value);
      } else {
        const purchasePrice = typeof scenarioA.purchasePrice === 'number' ? scenarioA.purchasePrice : 0;
        const numValue = Number(value);
        if (numValue > purchasePrice) value = purchasePrice;
        updatedInputs.downPayment = Number(value);
      }
    } else if (name === 'downPaymentType') {
      const purchasePrice = typeof scenarioA.purchasePrice === 'number' ? scenarioA.purchasePrice : 0;
      const downPayment = typeof scenarioA.downPayment === 'number' ? scenarioA.downPayment : 0;
      
      if (value === 'percent') {
        updatedInputs.downPayment = Math.round((downPayment / purchasePrice) * 100);
      } else {
        updatedInputs.downPayment = Math.round(purchasePrice * (downPayment / 100) / 100) * 100;
      }
    }
  
    setScenarioA(updatedInputs);
  };

  // Handle input changes for Scenario B
  const handleScenarioBChange = (name: keyof ScenarioState, value: string | number) => {
    // Handle empty string
    if (value === '') {
      setScenarioB(prev => ({ ...prev, [name]: '' }));
      return;
    }
    
    // For numeric fields
    if (typeof scenarioB[name] === 'number') {
      // Convert to number and prevent leading zeros
      const numericValue = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : String(value);
      value = Number(numericValue);
    }
    
    const updatedInputs = { ...scenarioB, [name]: value };
  
    // Update related values
    if (name === 'purchasePrice' && scenarioB.downPaymentType === 'percent') {
      const purchasePrice = typeof value === 'number' ? value : 0;
      const downPaymentPercent = typeof scenarioB.downPayment === 'number' ? scenarioB.downPayment : 0;
      updatedInputs.downPayment = Math.round(purchasePrice * (downPaymentPercent / 100) / 100) * 100;
    } else if (name === 'downPayment') {
      if (scenarioB.downPaymentType === 'percent') {
        const numValue = Number(value);
        if (numValue > 100) value = 100;
        updatedInputs.downPayment = Number(value);
      } else {
        const purchasePrice = typeof scenarioB.purchasePrice === 'number' ? scenarioB.purchasePrice : 0;
        const numValue = Number(value);
        if (numValue > purchasePrice) value = purchasePrice;
        updatedInputs.downPayment = Number(value);
      }
    } else if (name === 'downPaymentType') {
      const purchasePrice = typeof scenarioB.purchasePrice === 'number' ? scenarioB.purchasePrice : 0;
      const downPayment = typeof scenarioB.downPayment === 'number' ? scenarioB.downPayment : 0;
      
      if (value === 'percent') {
        updatedInputs.downPayment = Math.round((downPayment / purchasePrice) * 100);
      } else {
        updatedInputs.downPayment = Math.round(purchasePrice * (downPayment / 100) / 100) * 100;
      }
    }
  
    setScenarioB(updatedInputs);
  };

  // Handle blur event
  const handleBlur = (scenario: 'A' | 'B', name: keyof ScenarioState) => {
    if (scenario === 'A') {
      if (scenarioA[name] === '') {
        setScenarioA(prev => ({ ...prev, [name]: 0 }));
      }
    } else {
      if (scenarioB[name] === '') {
        setScenarioB(prev => ({ ...prev, [name]: 0 }));
      }
    }
  };

  // Calculate mortgage details whenever inputs change
  useEffect(() => {
    if (Object.values(scenarioA).some(value => value === '') || Object.values(scenarioB).some(value => value === '')) {
      return;
    }
    
    calculateComparison();
  }, [scenarioA, scenarioB]);

  // Generate amortization schedule
  const generateAmortizationSchedule = (
    principal: number, 
    annualInterestRate: number, 
    amortizationYears: number, 
    paymentAmount: number, 
    paymentsPerYear: number,
    term: number,
    extraPayment: number,
    paymentIncrease: number,
    annualPrepayment: number
  ) => {
    const interestRatePerPayment = (annualInterestRate / 100) / paymentsPerYear;
    let balance = principal;
    let totalInterestPaid = 0;
    const yearlySchedule = [];
    let totalInterestPaidOverTerm = 0;
    let balanceAtEndOfTerm = 0;
    let lastPaymentNumber = 0;
    
    // Calculate adjusted payment with increase
    const adjustedPayment = paymentAmount * (1 + paymentIncrease / 100);
    
    // Process each year
    for (let year = 1; year <= amortizationYears; year++) {
      let yearlyPrincipalPaid = 0;
      let yearlyInterestPaid = 0;
      let yearlyExtraPayments = 0;
      
      // Process each payment in the year
      for (let i = 1; i <= paymentsPerYear; i++) {
        lastPaymentNumber++;
        if (balance <= 0) break;
        
        // Calculate interest and principal for this payment
        const interestForPayment = balance * interestRatePerPayment;
        let principalForPayment = Math.min(adjustedPayment - interestForPayment, balance);
        
        // Add extra payment if specified
        let extraPrincipalPaid = 0;
        if (extraPayment > 0) {
          extraPrincipalPaid = Math.min(extraPayment, balance - principalForPayment);
          principalForPayment += extraPrincipalPaid;
          yearlyExtraPayments += extraPrincipalPaid;
        }
        
        // Update balance
        balance -= principalForPayment;
        
        // Update yearly totals
        yearlyPrincipalPaid += principalForPayment;
        yearlyInterestPaid += interestForPayment;
        totalInterestPaid += interestForPayment;
        
        // Record balance at end of term
        if (year === term && i === paymentsPerYear) {
          balanceAtEndOfTerm = balance;
          totalInterestPaidOverTerm = totalInterestPaid;
        }
      }
      
      // Apply annual prepayment if specified
      if (annualPrepayment > 0 && balance > 0) {
        const annualPrepaymentAmount = Math.min(
          principal * (annualPrepayment / 100),
          balance
        );
        balance -= annualPrepaymentAmount;
        yearlyPrincipalPaid += annualPrepaymentAmount;
        yearlyExtraPayments += annualPrepaymentAmount;
      }
      
      // Add year to schedule
      yearlySchedule.push({
        year,
        principalPaid: yearlyPrincipalPaid,
        interestPaid: yearlyInterestPaid,
        extraPayments: yearlyExtraPayments,
        endingBalance: balance
      });
      
      if (balance <= 0) break;
    }
    
    // Calculate effective amortization in years
    const effectiveAmortizationYears = lastPaymentNumber / paymentsPerYear;
    
    return {
      yearlySchedule,
      totalInterestPaid,
      totalInterestPaidOverTerm,
      balanceAtEndOfTerm,
      effectiveAmortizationYears
    };
  };

  // Calculate mortgage comparison
  const calculateComparison = () => {
    // Calculate for Scenario A
    const resultA = calculateMortgage(scenarioA);
    
    // Calculate for Scenario B
    const resultB = calculateMortgage(scenarioB);
    
    // Calculate differences
    const differences = {
      monthlyPayment: resultB.monthlyPayment - resultA.monthlyPayment,
      totalInterestTerm: resultB.totalInterestTerm - resultA.totalInterestTerm,
      totalInterestLifetime: resultB.totalInterestLifetime - resultA.totalInterestLifetime,
      balanceAtEndOfTerm: resultB.balanceAtEndOfTerm - resultA.balanceAtEndOfTerm,
      timeShaved: resultA.effectiveAmortization - resultB.effectiveAmortization
    };
    
    // Update comparison results
    setComparison({
      scenarioA: resultA,
      scenarioB: resultB,
      differences
    } as const);
  };

  // Calculate mortgage for a single scenario
  const calculateMortgage = (scenario: ScenarioState) => {
    // Calculate mortgage amount (purchase price minus down payment)
    let downPaymentAmount;
    if (scenario.downPaymentType === 'amount') {
      downPaymentAmount = scenario.downPayment;
    } else {
      downPaymentAmount = scenario.purchasePrice * (scenario.downPayment / 100);
    }
    
    const mortgageAmount = scenario.purchasePrice - downPaymentAmount;
    
    // Get payment frequency details
    const paymentFrequencyObj = PAYMENT_FREQUENCIES.find(f => f.value === scenario.paymentFrequency) ?? PAYMENT_FREQUENCIES[0];
    const paymentsPerYear = paymentFrequencyObj.paymentsPerYear;
    
    // Calculate interest rate per payment period
    const annualInterestRate = scenario.interestRate / 100;
    const interestRatePerPayment = annualInterestRate / paymentsPerYear;
    
    // Calculate total number of payments
    const totalPayments = scenario.amortizationPeriod * paymentsPerYear;
    
    // Calculate payment amount
    let paymentAmount;
    if (scenario.interestRate === 0) {
      paymentAmount = mortgageAmount / totalPayments;
    } else {
      paymentAmount = mortgageAmount * 
        (interestRatePerPayment * Math.pow(1 + interestRatePerPayment, totalPayments)) / 
        (Math.pow(1 + interestRatePerPayment, totalPayments) - 1);
    }
    
    // If accelerated payments, adjust the payment amount
    if (scenario.paymentFrequency === 'accelerated_biweekly') {
      const monthlyEquivalent = mortgageAmount * 
        (annualInterestRate/12 * Math.pow(1 + annualInterestRate/12, scenario.amortizationPeriod * 12)) / 
        (Math.pow(1 + annualInterestRate/12, scenario.amortizationPeriod * 12) - 1);
      paymentAmount = monthlyEquivalent / 2;
    } else if (scenario.paymentFrequency === 'accelerated_weekly') {
      const monthlyEquivalent = mortgageAmount * 
        (annualInterestRate/12 * Math.pow(1 + annualInterestRate/12, scenario.amortizationPeriod * 12)) / 
        (Math.pow(1 + annualInterestRate/12, scenario.amortizationPeriod * 12) - 1);
      paymentAmount = monthlyEquivalent / 4;
    }
    
    // Calculate monthly equivalent for comparison
    const monthlyPayment = scenario.paymentFrequency === 'monthly' 
      ? paymentAmount 
      : paymentAmount * paymentsPerYear / 12;
    
    // Generate detailed amortization schedule
    const scheduleResult = generateAmortizationSchedule(
      mortgageAmount,
      scenario.interestRate,
      scenario.amortizationPeriod,
      paymentAmount,
      paymentsPerYear,
      scenario.term,
      scenario.extraPayment,
      scenario.paymentIncrease,
      scenario.annualPrepayment
    );
    
    // Return calculated results
    return {
      monthlyPayment,
      totalMortgage: mortgageAmount,
      totalInterestTerm: scheduleResult.totalInterestPaidOverTerm,
      totalInterestLifetime: scheduleResult.totalInterestPaid,
      balanceAtEndOfTerm: scheduleResult.balanceAtEndOfTerm,
      effectiveAmortization: scheduleResult.effectiveAmortizationYears,
      amortizationSchedule: scheduleResult.yearlySchedule
    };
  };

  // Prepare comparison data for chart visualization
  const prepareBalanceComparisonData = () => {
    if (!comparison.scenarioA.amortizationSchedule.length || !comparison.scenarioB.amortizationSchedule.length) {
      return [];
    }
    
    const maxYears = Math.max(
      comparison.scenarioA.amortizationSchedule.length,
      comparison.scenarioB.amortizationSchedule.length
    );
    
    const data = [];
    for (let i = 0; i < maxYears; i++) {
      const dataPoint = { 
        year: i + 1,
        scenarioA: i < comparison.scenarioA.amortizationSchedule.length 
          ? comparison.scenarioA.amortizationSchedule[i].endingBalance 
          : 0,
        scenarioB: i < comparison.scenarioB.amortizationSchedule.length 
          ? comparison.scenarioB.amortizationSchedule[i].endingBalance 
          : 0
      };
      
      data.push(dataPoint);
    }
    
    return data;
  };

  // Prepare interest paid comparison data
  const prepareInterestComparisonData = () => {
    return [
      {
        name: "Over Term",
        scenarioA: comparison.scenarioA.totalInterestTerm,
        scenarioB: comparison.scenarioB.totalInterestTerm,
        savings: Math.abs(comparison.differences.totalInterestTerm)
      },
      {
        name: "Lifetime",
        scenarioA: comparison.scenarioA.totalInterestLifetime,
        scenarioB: comparison.scenarioB.totalInterestLifetime,
        savings: Math.abs(comparison.differences.totalInterestLifetime)
      }
    ];
  };

  const renderInput = (
    scenario: 'A' | 'B',
    name: string,
    label: string,
    prefix: string = '$',
    step?: number
  ) => {
    const scenarioState = scenario === 'A' ? scenarioA : scenarioB;
    const handleChange = scenario === 'A' ? handleScenarioAChange : handleScenarioBChange;
    
    return (
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">{prefix}</span>
          <input
            type="number"
            step={step}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            value={scenarioState[name] === 0 || scenarioState[name] === undefined ? '' : scenarioState[name]}
            onChange={(e) => handleChange(name as keyof ScenarioState, e.target.value)}
            onBlur={() => handleBlur(scenario, name as keyof ScenarioState)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-blue-800 mb-4 md:mb-6 text-center">Mortgage Scenario Comparison</h1>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex justify-center">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${activeTab === 'input' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('input')}
            >
              Input Scenarios
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('results')}
            >
              Compare Results
            </button>
          </div>
        </div>
      </div>
      
      {activeTab === 'input' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scenario A inputs */}
          <div className="p-4 bg-blue-50 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-blue-800 border-b pb-2">Scenario A</h2>
            
            <div className="space-y-2">
              {renderInput('A', 'purchasePrice', 'Purchase Price')}
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-gray-700">Down Payment</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      {scenarioA.downPaymentType === 'amount' ? '$' : '%'}
                    </span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={scenarioA.downPayment === 0 || scenarioA.downPayment === undefined ? '' : scenarioA.downPayment}
                      onChange={(e) => handleScenarioAChange('downPayment', e.target.value)}
                      onBlur={() => handleBlur('A', 'downPayment')}
                    />
                  </div>
                  <select
                    className="border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    value={scenarioA.downPaymentType}
                    onChange={(e) => handleScenarioAChange('downPaymentType', e.target.value)}
                  >
                    <option value="amount">$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
              
              {renderInput('A', 'interestRate', 'Interest Rate (%)', '%', 0.01)}
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-gray-700">Amortization Period</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={scenarioA.amortizationPeriod}
                  onChange={(e) => handleScenarioAChange('amortizationPeriod', Number(e.target.value))}
                >
                  {AMORTIZATION_PERIODS.map(period => (
                    <option key={period.value} value={period.value}>{period.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-gray-700">Term Length</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={scenarioA.term}
                  onChange={(e) => handleScenarioAChange('term', Number(e.target.value))}
                >
                  {TERM_LENGTHS.map(term => (
                    <option key={term.value} value={term.value}>{term.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-gray-700">Payment Frequency</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={scenarioA.paymentFrequency}
                  onChange={(e) => handleScenarioAChange('paymentFrequency', e.target.value)}
                >
                  {PAYMENT_FREQUENCIES.map(frequency => (
                    <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <h3 className="text-md font-medium mb-2 text-gray-800">Prepayment Options</h3>
                {renderInput('A', 'extraPayment', 'Extra Payment Per Period')}
                {renderInput('A', 'paymentIncrease', 'Payment Increase (%)', '%')}
                {renderInput('A', 'annualPrepayment', 'Annual Lump Sum (% of principal)', '%')}
              </div>
            </div>
          </div>
          
          {/* Scenario B inputs */}
          <div className="p-4 bg-green-50 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-green-800 border-b pb-2">Scenario B</h2>
            
            <div className="space-y-2">
              {renderInput('B', 'purchasePrice', 'Purchase Price')}
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-gray-700">Down Payment</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      {scenarioB.downPaymentType === 'amount' ? '$' : '%'}
                    </span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={scenarioB.downPayment === 0 || scenarioB.downPayment === undefined ? '' : scenarioB.downPayment}
                      onChange={(e) => handleScenarioBChange('downPayment', e.target.value)}
                      onBlur={() => handleBlur('B', 'downPayment')}
                    />
                  </div>
                  <select
                    className="border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    value={scenarioB.downPaymentType}
                    onChange={(e) => handleScenarioBChange('downPaymentType', e.target.value)}
                  >
                    <option value="amount">$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
              
              {renderInput('B', 'interestRate', 'Interest Rate (%)', '%', 0.01)}
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-gray-700">Amortization Period</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={scenarioB.amortizationPeriod}
                  onChange={(e) => handleScenarioBChange('amortizationPeriod', Number(e.target.value))}
                >
                  {AMORTIZATION_PERIODS.map(period => (
                    <option key={period.value} value={period.value}>{period.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-gray-700">Term Length</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={scenarioB.term}
                  onChange={(e) => handleScenarioBChange('term', Number(e.target.value))}
                >
                  {TERM_LENGTHS.map(term => (
                    <option key={term.value} value={term.value}>{term.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-gray-700">Payment Frequency</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={scenarioB.paymentFrequency}
                  onChange={(e) => handleScenarioBChange('paymentFrequency', e.target.value)}
                >
                  {PAYMENT_FREQUENCIES.map(frequency => (
                    <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <h3 className="text-md font-medium mb-2 text-gray-800">Prepayment Options</h3>
                {renderInput('B', 'extraPayment', 'Extra Payment Per Period')}
                {renderInput('B', 'paymentIncrease', 'Payment Increase (%)', '%')}
                {renderInput('B', 'annualPrepayment', 'Annual Lump Sum (% of principal)', '%')}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-center mt-4">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium shadow-md transition"
              onClick={() => setActiveTab('results')}
            >
              Compare Scenarios
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white border rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Comparison Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 flex flex-col justify-center">
                <div className="space-y-2 text-center">
                  <div className="text-sm font-medium text-gray-500">Better Option</div>
                  <div className={`text-2xl font-bold ${comparison.differences.totalInterestLifetime <= 0 ? 'text-blue-700' : 'text-green-700'}`}>
                    {comparison.differences.totalInterestLifetime <= 0 ? 'Scenario A' : 'Scenario B'}
                  </div>
                  <div className="text-lg font-semibold text-gray-700">
                    Lifetime Savings: {formatCurrency(Math.abs(comparison.differences.totalInterestLifetime))}
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Monthly Payment</div>
                    <div className="text-sm md:text-base font-medium">
                      <span className="bg-blue-100 px-2 py-1 rounded">{formatCurrency(comparison.scenarioA.monthlyPayment)}</span>
                      {' vs '}
                      <span className="bg-green-100 px-2 py-1 rounded">{formatCurrency(comparison.scenarioB.monthlyPayment)}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Interest (Term)</div>
                    <div className="text-sm md:text-base font-medium">
                      <span className="bg-blue-100 px-2 py-1 rounded">{formatCurrency(comparison.scenarioA.totalInterestTerm)}</span>
                      {' vs '}
                      <span className="bg-green-100 px-2 py-1 rounded">{formatCurrency(comparison.scenarioB.totalInterestTerm)}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Interest (Lifetime)</div>
                    <div className="text-sm md:text-base font-medium">
                      <span className="bg-blue-100 px-2 py-1 rounded">{formatCurrency(comparison.scenarioA.totalInterestLifetime)}</span>
                      {' vs '}
                      <span className="bg-green-100 px-2 py-1 rounded">{formatCurrency(comparison.scenarioB.totalInterestLifetime)}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Payment Frequency</div>
                    <div className="text-sm md:text-base font-medium">
                      <span className="bg-blue-100 px-2 py-1 rounded">
                        {PAYMENT_FREQUENCIES.find(f => f.value === scenarioA.paymentFrequency)?.label}
                      </span>
                      {' vs '}
                      <span className="bg-green-100 px-2 py-1 rounded">
                        {PAYMENT_FREQUENCIES.find(f => f.value === scenarioB.paymentFrequency)?.label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Balance After Term</div>
                    <div className="text-sm md:text-base font-medium">
                      <span className="bg-blue-100 px-2 py-1 rounded">{formatCurrency(comparison.scenarioA.balanceAtEndOfTerm)}</span>
                      {' vs '}
                      <span className="bg-green-100 px-2 py-1 rounded">{formatCurrency(comparison.scenarioB.balanceAtEndOfTerm)}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Effective Amortization</div>
                    <div className="text-sm md:text-base font-medium">
                      <span className="bg-blue-100 px-2 py-1 rounded">{comparison.scenarioA.effectiveAmortization.toFixed(1)} yrs</span>
                      {' vs '}
                      <span className="bg-green-100 px-2 py-1 rounded">{comparison.scenarioB.effectiveAmortization.toFixed(1)} yrs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Balance Comparison Chart */}
            <div className="bg-white border rounded-lg p-4 shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Mortgage Balance Over Time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={prepareBalanceComparisonData()}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="scenarioA"
                      name="Scenario A"
                      stroke="#2563eb"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="scenarioB"
                      name="Scenario B"
                      stroke="#16a34a"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Interest Comparison Chart */}
            <div className="bg-white border rounded-lg p-4 shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Interest Cost Comparison</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareInterestComparisonData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="scenarioA" name="Scenario A" fill="#93c5fd" />
                    <Bar dataKey="scenarioB" name="Scenario B" fill="#86efac" />
                    <Bar dataKey="savings" name="Savings" fill="#fb923c" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Detailed Comparison Table */}
          <div className="bg-white border rounded-lg p-4 shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Detailed Comparison</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scenario A</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scenario B</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Purchase Price</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(scenarioA.purchasePrice)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(scenarioB.purchasePrice)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(scenarioB.purchasePrice - scenarioA.purchasePrice)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Down Payment</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {scenarioA.downPaymentType === 'amount' 
                        ? formatCurrency(scenarioA.downPayment)
                        : formatCurrency(scenarioA.purchasePrice * scenarioA.downPayment / 100)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {scenarioB.downPaymentType === 'amount' 
                        ? formatCurrency(scenarioB.downPayment)
                        : formatCurrency(scenarioB.purchasePrice * scenarioB.downPayment / 100)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(
                        (scenarioB.downPaymentType === 'amount' 
                          ? scenarioB.downPayment
                          : scenarioB.purchasePrice * scenarioB.downPayment / 100) -
                        (scenarioA.downPaymentType === 'amount' 
                          ? scenarioA.downPayment
                          : scenarioA.purchasePrice * scenarioA.downPayment / 100)
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Mortgage Amount</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioA.totalMortgage)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioB.totalMortgage)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioB.totalMortgage - comparison.scenarioA.totalMortgage)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Interest Rate</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(scenarioA.interestRate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(scenarioB.interestRate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(scenarioB.interestRate - scenarioA.interestRate)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Monthly Payment</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioA.monthlyPayment)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioB.monthlyPayment)}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm ${comparison.differences.monthlyPayment < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(comparison.differences.monthlyPayment)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Interest Over Term</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioA.totalInterestTerm)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioB.totalInterestTerm)}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm ${comparison.differences.totalInterestTerm < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(comparison.differences.totalInterestTerm)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Interest Over Lifetime</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioA.totalInterestLifetime)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioB.totalInterestLifetime)}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm ${comparison.differences.totalInterestLifetime < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(comparison.differences.totalInterestLifetime)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Balance at End of Term</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioA.balanceAtEndOfTerm)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(comparison.scenarioB.balanceAtEndOfTerm)}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm ${comparison.differences.balanceAtEndOfTerm < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(comparison.differences.balanceAtEndOfTerm)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Years to Pay Off</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{comparison.scenarioA.effectiveAmortization.toFixed(2)} years</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{comparison.scenarioB.effectiveAmortization.toFixed(2)} years</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm ${comparison.differences.timeShaved > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {comparison.differences.timeShaved.toFixed(2)} years
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium shadow-md transition"
              onClick={() => setActiveTab('input')}
            >
              Update Scenarios
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-6 text-center p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          This calculator provides estimates only and should not be considered financial advice.
          Consult with a mortgage professional for personalized information.
        </p>
      </div>
    </div>
  );
};

export default MortgageComparisonCalculator;