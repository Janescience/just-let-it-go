import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { Booth, MenuItem } from '@/types';
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2MenuSelection } from './steps/Step2MenuSelection';
import { Step3Summary } from './steps/Step3Summary';
import { BusinessPlan, LocalIngredient } from './types/BusinessPlanTypes';

interface BoothModalProps {
  booth?: Booth;
  booths: Booth[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BoothModal({ booth, booths, onClose, onSuccess }: BoothModalProps) {
  const isEditing = !!booth;
  const [currentStep, setCurrentStep] = useState(1);
  const [businessPlan, setBusinessPlan] = useState<BusinessPlan>({
    // Basic Info
    name: booth?.name || '',
    location: booth?.location || '',
    startDate: booth?.startDate ? new Date(booth.startDate).toISOString().split('T')[0] : '',
    endDate: booth?.endDate ? new Date(booth.endDate).toISOString().split('T')[0] : '',
    numberOfDays: 10,
    rentCost: booth?.rentCost || 0,
    openingStart: booth?.openingHours?.start || '08:00',
    openingEnd: booth?.openingHours?.end || '18:00',
    staffUsername: booth?.staff?.username || '',
    staffPassword: booth?.staff?.password || '',
    employees: booth?.employees?.map(emp => ({
      name: emp.name,
      salary: emp.salary?.toString() || '0',
      position: emp.position || 'พนักงาน'
    })) || [
      { name: '', salary: '0', position: 'พนักงาน' }
    ],

    // Menu & Calculations - will be populated later
    selectedMenuItems: [],
    menuItemProportions: {},
    fixedCosts: {
      rent: 0,
      staff: 0,
      equipment: 0,
      total: 0
    },
    breakEven: {
      unitsNeeded: 0,
      revenueNeeded: 0,
      dailyTarget: 0
    },
    profitBreakEven: {
      unitsNeeded: 0,
      revenueNeeded: 0,
      dailyTarget: 0
    },
    ingredients: [],
    totalCapital: 0,
    reserveFund: 0,
    targetProfit: {
      type: 'percentage',
      value: 20,
      unitsNeeded: 0,
      revenueNeeded: 0,
      additionalIngredients: 0,
      totalCapitalWithProfit: 0
    }
  });

  const [availableMenuItems, setAvailableMenuItems] = useState<MenuItem[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<LocalIngredient[]>([]);
  const [availableEquipmentSets, setAvailableEquipmentSets] = useState<any[]>([]);
  const [equipmentTemplates, setEquipmentTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [staffCredentials, setStaffCredentials] = useState<{username: string, password: string} | null>(null);
  const [pendingMenuItemIds, setPendingMenuItemIds] = useState<string[]>([]);

  // Auto-generate credentials for new booths
  useEffect(() => {
    if (!isEditing && businessPlan.name) {
      const username = businessPlan.name; // Same as booth name
      const password = '123456'; // Fixed password

      setBusinessPlan(prev => ({
        ...prev,
        staffUsername: username,
        staffPassword: password
      }));
    }
  }, [businessPlan.name, isEditing]);

  useEffect(() => {
    if (currentStep === 1) {
      fetchEquipmentData();
    }
    if (currentStep === 2) {
      fetchMenuItems();
      fetchIngredients();
    }
  }, [currentStep]);

  // Calculate business plan whenever relevant data changes
  useEffect(() => {
    if (businessPlan.selectedMenuItems.length > 0 && availableIngredients.length > 0) {
      calculateBusinessPlan();
    }
  }, [businessPlan.selectedMenuItems, businessPlan.menuItemProportions, businessPlan.rentCost, businessPlan.employees, businessPlan.startDate, businessPlan.endDate, businessPlan.targetProfit.value, businessPlan.initialStock, businessPlan.equipmentSetId, availableIngredients]);

  // Separate effect to recalculate when equipment changes (even without menu items)
  useEffect(() => {
    if (businessPlan.equipmentSetId && availableIngredients.length > 0) {
      // If we have selected menu items, run full calculation
      if (businessPlan.selectedMenuItems.length > 0) {
        calculateBusinessPlan();
      } else {
        // If no menu items yet, just update the equipment cost
        updateEquipmentCostOnly();
      }
    }
  }, [businessPlan.equipmentSetId]);

  // Select pending menu items when availableMenuItems loads
  useEffect(() => {
    if (pendingMenuItemIds.length > 0 && availableMenuItems.length > 0) {
      const selectedItems = availableMenuItems.filter(item =>
        pendingMenuItemIds.includes(item._id)
      );

      if (selectedItems.length > 0) {
        setBusinessPlan(prev => ({
          ...prev,
          selectedMenuItems: selectedItems,
          menuItemProportions: selectedItems.reduce((acc, item) => {
            acc[item._id] = Math.round(100 / selectedItems.length);
            return acc;
          }, {} as { [key: string]: number })
        }));

        // Clear pending IDs
        setPendingMenuItemIds([]);
      }
    }
  }, [pendingMenuItemIds, availableMenuItems]);

  // Auto-calculate end date when start date or number of days change
  useEffect(() => {
    if (businessPlan.startDate && businessPlan.numberOfDays > 0) {
      const startDate = new Date(businessPlan.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + businessPlan.numberOfDays - 1);

      const endDateString = endDate.toISOString().split('T')[0];

      if (businessPlan.endDate !== endDateString) {
        setBusinessPlan(prev => ({
          ...prev,
          endDate: endDateString
        }));
      }
    }
  }, [businessPlan.startDate, businessPlan.numberOfDays]);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu-items');
      if (response.ok) {
        const data = await response.json();
        setAvailableMenuItems(data.menuItems || []);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      if (response.ok) {
        const data = await response.json();
        console.log('Ingredients data:', data);
        setAvailableIngredients(data.ingredients || []);
      } else {
        console.error('Failed to fetch ingredients, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const fetchEquipmentData = async () => {
    if (availableEquipmentSets.length > 0 && equipmentTemplates.length > 0) {
      return; // Already have data, don't fetch again
    }

    try {
      // Fetch available equipment sets
      const setsResponse = await fetch('/api/equipment/sets?status=available', {
        credentials: 'include'
      });
      if (setsResponse.ok) {
        const setsData = await setsResponse.json();
        setAvailableEquipmentSets(setsData.sets || []);
      }

      // Fetch templates for display
      const templatesResponse = await fetch('/api/equipment/templates', {
        credentials: 'include'
      });
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setEquipmentTemplates(templatesData.templates || []);
      }
    } catch (error) {
      console.error('Error fetching equipment data:', error);
    }
  };

  // Function to calculate equipment cost
  const calculateEquipmentCost = async (equipmentSetId?: string) => {
    const setId = equipmentSetId || businessPlan.equipmentSetId;
    if (!setId) return 0;

    try {
      // Fetch equipment set and template data
      const setResponse = await fetch(`/api/equipment/sets/${setId}`, {
        credentials: 'include'
      });
      if (setResponse.ok) {
        const setData = await setResponse.json();
        console.log('🔧 setData.equipmentSet:', setData.equipmentSet);
        console.log('🔧 templateId:', setData.equipmentSet.templateId);

        // Handle both populated and unpopulated templateId
        let templateId;
        if (typeof setData.equipmentSet.templateId === 'object') {
          templateId = setData.equipmentSet.templateId._id || setData.equipmentSet.templateId.id;
        } else {
          templateId = setData.equipmentSet.templateId;
        }

        // Additional safety check
        if (!templateId || typeof templateId !== 'string') {
          console.error('🔧 Invalid templateId:', templateId, typeof templateId);
          return 0;
        }

        console.log('🔧 resolved templateId:', templateId);

        const templateResponse = await fetch(`/api/equipment/templates/${templateId}`, {
          credentials: 'include'
        });
        if (templateResponse.ok) {
          const templateData = await templateResponse.json();
          const daysDiff = businessPlan.numberOfDays;
          console.log('🔧 template dailyCost:', templateData.template.dailyCost);
          console.log('🔧 daysDiff:', daysDiff);
          return templateData.template.dailyCost * daysDiff;
        }
      }
    } catch (error) {
      console.error('Error calculating equipment cost:', error);
    }
    return 0;
  };

  // Function to update only equipment cost when no menu items selected yet
  const updateEquipmentCostOnly = async () => {
    console.log('🔧 updateEquipmentCostOnly - equipmentSetId:', businessPlan.equipmentSetId);
    const equipmentCost = await calculateEquipmentCost();
    console.log('🔧 updateEquipmentCostOnly - equipmentCost:', equipmentCost);

    setBusinessPlan(prev => ({
      ...prev,
      fixedCosts: {
        ...prev.fixedCosts,
        equipment: equipmentCost,
        total: prev.fixedCosts.rent + prev.fixedCosts.staff + equipmentCost
      }
    }));
    console.log('🔧 updateEquipmentCostOnly - Updated equipment cost:', equipmentCost);
  };

  const calculateBusinessPlan = async () => {
    if (businessPlan.selectedMenuItems.length === 0) return;

    console.log('🔧 calculateBusinessPlan - equipmentSetId:', businessPlan.equipmentSetId);

    // Calculate period duration
    const startDate = new Date(businessPlan.startDate);
    const endDate = new Date(businessPlan.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Fixed costs calculation - daily rate × number of days
    const totalStaffCost = businessPlan.employees.reduce((sum, emp) =>
      sum + (parseFloat(emp.salary || '0') * daysDiff), 0
    );

    // Calculate equipment cost if selected
    const equipmentCost = await calculateEquipmentCost();
    console.log('🔧 calculateBusinessPlan - equipmentCost:', equipmentCost);

    const fixedCosts = {
      rent: businessPlan.rentCost,
      staff: totalStaffCost,
      equipment: equipmentCost,
      total: businessPlan.rentCost + totalStaffCost + equipmentCost
    };

    // Calculate average profit per item
    const averageProfit = businessPlan.selectedMenuItems.reduce((sum, item) => {
      const ingredientCost = item.ingredients.reduce((cost, ing) => {
        const ingredient = availableIngredients.find(avail => avail._id === ing.ingredientId);
        return cost + (ingredient ? ingredient.costPerUnit * ing.quantity : 0);
      }, 0);
      return sum + (item.price - ingredientCost);
    }, 0) / businessPlan.selectedMenuItems.length;

    // Break-even calculation (true break-even = 0% profit)
    const trueBreakEvenUnits = Math.ceil(fixedCosts.total / averageProfit);
    const averagePrice = businessPlan.selectedMenuItems.reduce((sum, item) => sum + item.price, 0) / businessPlan.selectedMenuItems.length;
    const trueBreakEvenRevenue = trueBreakEvenUnits * averagePrice;
    const trueDailyTarget = Math.ceil(trueBreakEvenUnits / daysDiff);

    // 20% profit break-even (for Step 3+)
    const requiredProfit = fixedCosts.total * 0.20;
    const profitBreakEvenUnits = Math.ceil((fixedCosts.total + requiredProfit) / averageProfit);
    const profitBreakEvenRevenue = profitBreakEvenUnits * averagePrice;
    const profitDailyTarget = Math.ceil(profitBreakEvenUnits / daysDiff);

    // Ingredients needed for true break-even
    const trueIngredientsNeeded = calculateIngredientsNeeded(trueBreakEvenUnits);
    const trueTotalIngredientCost = trueIngredientsNeeded.reduce((sum, ing) => sum + ing.cost, 0);
    const trueBaseCapital = fixedCosts.total + trueTotalIngredientCost;
    const trueReserveFund = trueBaseCapital * 0.1; // 10% reserve fund
    const trueTotalCapital = trueBaseCapital + trueReserveFund;

    // Target profit calculation (uses profit break-even as baseline)
    const targetProfit = calculateTargetProfit(fixedCosts.total, profitBreakEvenRevenue);

    setBusinessPlan(prev => ({
      ...prev,
      fixedCosts,
      breakEven: {
        unitsNeeded: trueBreakEvenUnits,
        revenueNeeded: trueBreakEvenRevenue,
        dailyTarget: trueDailyTarget
      },
      profitBreakEven: {
        unitsNeeded: profitBreakEvenUnits,
        revenueNeeded: profitBreakEvenRevenue,
        dailyTarget: profitDailyTarget
      },
      ingredients: trueIngredientsNeeded,
      totalCapital: trueTotalCapital,
      reserveFund: trueReserveFund,
      targetProfit: {
        ...prev.targetProfit,
        ...targetProfit
      }
    }));

    console.log('🔧 calculateBusinessPlan - Updated fixedCosts:', fixedCosts);
  };

  const getRequiredIngredients = () => {
    const ingredientMap = new Map();

    businessPlan.selectedMenuItems.forEach(menuItem => {
      if (menuItem.ingredients) {
        menuItem.ingredients.forEach(ing => {
          let ingredient: any;

          if (typeof ing.ingredientId === 'object' && (ing.ingredientId as any).name) {
            ingredient = ing.ingredientId;
          } else {
            ingredient = availableIngredients.find(avail => avail._id === ing.ingredientId);
          }

          if (ingredient) {
            const key = ingredient._id;
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, {
                id: ingredient._id,
                name: ingredient.name,
                unit: ingredient.unit,
                totalNeeded: 0
              });
            }

            const current = ingredientMap.get(key);
            current.totalNeeded += ing.quantity;
          }
        });
      }
    });

    return Array.from(ingredientMap.values());
  };

  const calculateIngredientsNeeded = (totalUnits: number) => {
    const ingredientMap = new Map();

    businessPlan.selectedMenuItems.forEach(menuItem => {
      const proportion = businessPlan.menuItemProportions[menuItem._id] || 0;
      const unitsPerMenu = (totalUnits * proportion) / 100; // Use proportion instead of equal distribution

      if (menuItem.ingredients) {
        menuItem.ingredients.forEach(ing => {
          // If ingredientId is populated, use it directly; otherwise find in availableIngredients
          let ingredient: any;

          if (typeof ing.ingredientId === 'object' && (ing.ingredientId as any).name) {
            // Already populated
            ingredient = ing.ingredientId;
          } else {
            // Find in availableIngredients
            ingredient = availableIngredients.find(avail => avail._id === ing.ingredientId);
          }

          if (ingredient) {
            const key = ingredient._id;
            const neededQuantity = ing.quantity * unitsPerMenu;

            if (ingredientMap.has(key)) {
              ingredientMap.get(key).quantity += neededQuantity;
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: neededQuantity,
                unit: ingredient.unit,
                costPerUnit: ingredient.costPerUnit
              });
            }
          }
        });
      }
    });

    // Round up quantities and calculate cost from rounded quantities
    return Array.from(ingredientMap.values()).map(ing => ({
      ...ing,
      quantity: Math.ceil(ing.quantity),
      cost: Math.ceil(ing.quantity) * ing.costPerUnit
    }));
  };

  const calculateTargetProfit = (currentFixedCosts?: number, currentBreakEvenRevenue?: number) => {
    const { type, value } = businessPlan.targetProfit;

    if (type === 'percentage' && value > 0) {
      // Calculate fixed costs
      const fixedCosts = currentFixedCosts || businessPlan.fixedCosts.total;

      // Calculate ingredient costs for break-even
      const averagePrice = businessPlan.selectedMenuItems.reduce((sum, item) => sum + item.price, 0) / businessPlan.selectedMenuItems.length;
      const averageProfit = businessPlan.selectedMenuItems.reduce((sum, item) => {
        const ingredientCost = item.ingredients.reduce((cost, ing) => {
          const ingredient = availableIngredients.find(avail => avail._id === ing.ingredientId);
          return cost + (ingredient ? ingredient.costPerUnit * ing.quantity : 0);
        }, 0);
        return sum + (item.price - ingredientCost);
      }, 0) / businessPlan.selectedMenuItems.length;

      const breakEvenUnits = Math.ceil(fixedCosts / averageProfit);
      const ingredientCosts = calculateIngredientsNeeded(breakEvenUnits).reduce((sum, ing) => sum + ing.cost, 0);

      // Base capital = fixed costs + ingredient costs
      const baseCapital = fixedCosts + ingredientCosts;
      const totalCapitalWithBuffer = baseCapital + (baseCapital * 0.1); // 10% buffer of total capital

      const targetProfitAmount = totalCapitalWithBuffer * (value / 100);

      // Calculate revenue needed (considering profit margin on each sale)
      const profitDecimal = value / 100;

      // Iterative calculation to find the right revenue
      let estimatedRevenue = totalCapitalWithBuffer + targetProfitAmount;
      for (let i = 0; i < 10; i++) { // Max 10 iterations
        const averagePrice = businessPlan.selectedMenuItems.reduce((sum, item) => sum + item.price, 0) / businessPlan.selectedMenuItems.length;
        const estimatedUnits = Math.ceil(estimatedRevenue / averagePrice);

        // Calculate ingredient costs for these units
        const ingredientCosts = calculateIngredientsNeeded(estimatedUnits).reduce((sum, ing) => sum + ing.cost, 0);

        // Base capital and total with buffer
        const baseCapital = fixedCosts + ingredientCosts;
        const totalCapitalWithBuffer = baseCapital + (baseCapital * 0.1);

        // Required revenue to achieve target profit
        const requiredRevenue = totalCapitalWithBuffer / (1 - profitDecimal);

        if (Math.abs(requiredRevenue - estimatedRevenue) < 100) { // Convergence check
          estimatedRevenue = requiredRevenue;
          break;
        }
        estimatedRevenue = requiredRevenue;
      }

      // Final calculation
      if (estimatedRevenue > 0) {
        const averagePrice = businessPlan.selectedMenuItems.reduce((sum, item) => sum + item.price, 0) / businessPlan.selectedMenuItems.length;
        const finalUnits = Math.ceil(estimatedRevenue / averagePrice);
        const finalIngredientCosts = calculateIngredientsNeeded(finalUnits).reduce((sum, ing) => sum + ing.cost, 0);

        const finalBaseCapital = fixedCosts + finalIngredientCosts;
        const finalTotalCapitalWithBuffer = finalBaseCapital + (finalBaseCapital * 0.1);

        return {
          type,
          value,
          unitsNeeded: finalUnits,
          revenueNeeded: estimatedRevenue,
          additionalIngredients: finalIngredientCosts,
          totalCapitalWithProfit: finalTotalCapitalWithBuffer
        };
      }
    }

    // Default/fallback for amount type or if calculation fails
    const averagePrice = businessPlan.selectedMenuItems.reduce((sum, item) => sum + item.price, 0) / businessPlan.selectedMenuItems.length;
    const targetUnits = Math.ceil((currentBreakEvenRevenue || businessPlan.breakEven.revenueNeeded) / averagePrice);
    const targetRevenue = targetUnits * averagePrice;

    const additionalIngredients = calculateIngredientsNeeded(targetUnits);
    const additionalIngredientCost = additionalIngredients.reduce((sum, ing) => sum + ing.cost, 0);

    return {
      type,
      value,
      unitsNeeded: targetUnits,
      revenueNeeded: targetRevenue,
      additionalIngredients: additionalIngredientCost,
      totalCapitalWithProfit: (currentFixedCosts || businessPlan.fixedCosts.total) + additionalIngredientCost
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submitData = {
        name: businessPlan.name,
        location: businessPlan.location,
        startDate: businessPlan.startDate,
        endDate: businessPlan.endDate,
        rentCost: businessPlan.rentCost,
        openingHours: {
          start: businessPlan.openingStart,
          end: businessPlan.openingEnd
        },
        employees: businessPlan.employees.map(emp => ({
          ...emp,
          salary: parseFloat(emp.salary || '0') * businessPlan.numberOfDays // Convert daily rate to total
        })),
        staff: {
          username: businessPlan.staffUsername,
          password: businessPlan.staffPassword
        },
        menuItems: businessPlan.selectedMenuItems.map(item => item._id),
        businessPlan: {
          ...businessPlan,
          equipmentSetId: businessPlan.equipmentSetId
        },
        isActive: true
      };

      const response = await fetch(
        isEditing ? `/api/booths/${booth!._id}` : '/api/booths',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submitData)
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (!isEditing) {
          setStaffCredentials({
            username: businessPlan.staffUsername,
            password: businessPlan.staffPassword
          });
          setShowCredentials(true);
        } else {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Error saving booth:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = () => {
    setBusinessPlan(prev => ({
      ...prev,
      employees: [...prev.employees, { name: '', salary: '0', position: 'พนักงาน' }]
    }));
  };

  const removeEmployee = (index: number) => {
    setBusinessPlan(prev => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index)
    }));
  };

  const updateEmployee = (index: number, field: string, value: string) => {
    setBusinessPlan(prev => ({
      ...prev,
      employees: prev.employees.map((emp, i) =>
        i === index ? { ...emp, [field]: value } : emp
      )
    }));
  };

  const toggleMenuItem = (menuItem: MenuItem) => {
    setBusinessPlan(prev => {
      const isSelected = prev.selectedMenuItems.some(item => item._id === menuItem._id);
      let newSelectedItems;

      if (isSelected) {
        newSelectedItems = prev.selectedMenuItems.filter(item => item._id !== menuItem._id);
      } else {
        newSelectedItems = [...prev.selectedMenuItems, menuItem];
      }

      // Recalculate proportions equally when items change
      const newProportions: { [key: string]: number } = {};
      if (newSelectedItems.length > 0) {
        const equalProportion = Math.round(100 / newSelectedItems.length);
        newSelectedItems.forEach(item => {
          newProportions[item._id] = equalProportion;
        });
      }

      return {
        ...prev,
        selectedMenuItems: newSelectedItems,
        menuItemProportions: newProportions
      };
    });
  };

  const copyFromBooth = (boothId: string) => {
    const sourceBooth = booths.find(b => b._id === boothId);
    if (!sourceBooth) return;

    // Copy all data except staff credentials
    setBusinessPlan(prev => ({
      ...prev,
      // Basic info - leave name and location empty
      name: '',
      location: '',
      rentCost: sourceBooth.rentCost,
      startDate: new Date().toISOString().split('T')[0], // Today's date
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
      openingStart: sourceBooth.openingHours?.start || '08:00',
      openingEnd: sourceBooth.openingHours?.end || '18:00',
      // Keep current staff credentials (don't copy)
      staffUsername: '',
      staffPassword: '123456',
      // Employees - keep salary but clear names
      employees: sourceBooth.employees?.map(emp => ({
        name: '', // Clear employee names
        salary: emp.salary?.toString() || '0',
        position: emp.position || 'พนักงาน'
      })) || [{ name: '', salary: '0', position: 'พนักงาน' }],
      // Equipment set
      equipmentSetId: sourceBooth.businessPlan?.equipmentSetId,
      // Menu items - keep as empty array, will be populated when availableMenuItems loads
      selectedMenuItems: [],
      // Business plan data if exists
      ...(sourceBooth.businessPlan && {
        fixedCosts: {
          rent: sourceBooth.rentCost,
          staff: sourceBooth.employees?.reduce((sum, emp) => sum + ((emp.salary || 0) * prev.numberOfDays), 0) || 0,
          equipment: sourceBooth.businessPlan?.fixedCosts?.equipment || 0,
          total: sourceBooth.rentCost + (sourceBooth.employees?.reduce((sum, emp) => sum + ((emp.salary || 0) * prev.numberOfDays), 0) || 0) + (sourceBooth.businessPlan?.fixedCosts?.equipment || 0)
        },
        breakEven: sourceBooth.businessPlan.breakEven,
        ingredients: sourceBooth.businessPlan.ingredients,
        totalCapital: sourceBooth.businessPlan.totalCapital,
        targetProfit: sourceBooth.businessPlan.targetProfit
      })
    }));

    // Store menu item IDs to be selected when availableMenuItems loads
    if (sourceBooth.menuItems && sourceBooth.menuItems.length > 0) {
      setPendingMenuItemIds(sourceBooth.menuItems.map((item: any) => typeof item === 'string' ? item : item._id));
    }
  };

  const updateBasicInfo = (field: string, value: string | number) => {
    setBusinessPlan(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => {
    if (canProceedToNextStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        // Check all required fields are filled
        const hasBasicInfo = businessPlan.name.trim() && businessPlan.location.trim() &&
                           businessPlan.startDate && businessPlan.endDate && businessPlan.numberOfDays > 0 && businessPlan.rentCost > 0;

        // Check all employees have names (no empty names allowed)
        const hasEmployeeNames = businessPlan.employees.every(emp => emp.name.trim());

        // Check staff credentials are filled
        const hasStaffCredentials = businessPlan.staffUsername.trim() && businessPlan.staffPassword.trim();

        return hasBasicInfo && hasEmployeeNames && hasStaffCredentials;
      case 2:
        return businessPlan.selectedMenuItems.length > 0;
      default:
        return false;
    }
  };

  // Show credentials modal after successful creation
  if (showCredentials && staffCredentials) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg border border-gray-200 max-w-md w-full p-6">
          <h3 className="text-lg font-light mb-4 text-gray-800 tracking-wide">สร้างหน้าร้านสำเร็จ!</h3>
          <div className="space-y-4">
            <p className="text-gray-600 font-light text-sm">ข้อมูลการเข้าสู่ระบบสำหรับพนักงาน:</p>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <label className="block text-sm font-light text-gray-600">Username:</label>
                <p className="font-mono text-sm text-gray-800">{staffCredentials.username}</p>
              </div>
              <div>
                <label className="block text-sm font-light text-gray-600">Password:</label>
                <p className="font-mono text-sm text-gray-800">{staffCredentials.password}</p>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
              <p className="text-gray-700 text-sm font-light">
                💡 บันทึกข้อมูลนี้ไว้ เพื่อให้พนักงานใช้เข้าสู่ระบบขายสินค้า
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={onSuccess} className="flex-1">
              เสร็จสิ้น
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Editing mode - simplified modal
  if (isEditing) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="แก้ไขหน้าร้าน"
        size="md"
      >
        <div className="p-6">
          <div className="text-center text-gray-600 font-light text-sm">
            การแก้ไขหน้าร้านยังไม่รองรับ Business Planning Calculator
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={onClose} className="flex-1">
              ปิด
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="สร้างหน้าร้านใหม่"
      size="full"
      className="w-[95vw] h-[95vh] flex flex-col"
    >
      <div className="flex-1 flex flex-col overflow-hidden">{/* Content wrapper */}
      {/* Step Progress */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-center ">
          {[
            { number: 1, text: 'ตั้งค่าหน้าร้าน' },
            { number: 2, text: 'เลือกเมนู' },
            { number: 3, text: 'ยืนยัน' }
          ].map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step.number <= currentStep ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.number}
                </div>
                <div className={`text-xs font-light mt-1 ${
                  step.number === currentStep ? 'text-gray-800' : 'text-gray-500'
                }`}>
                  {step.text}
                </div>
              </div>
              {index < 2 && (
                <div className={`w-12 h-0.5 mx-3 mt-3 ${
                  step.number < currentStep ? 'bg-gray-800' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Step1BasicInfo
            businessPlan={businessPlan}
            booths={booths}
            isEditing={isEditing}
            onUpdateBasicInfo={updateBasicInfo}
            onCopyFromBooth={copyFromBooth}
            onAddEmployee={addEmployee}
            onRemoveEmployee={removeEmployee}
            onUpdateEmployee={updateEmployee}
            availableEquipmentSets={availableEquipmentSets}
            equipmentTemplates={equipmentTemplates}
          />
        )}

        {/* Step 2: Menu Selection & Stock Allocation */}
        {currentStep === 2 && (
          <Step2MenuSelection
            businessPlan={businessPlan}
            availableMenuItems={availableMenuItems}
            availableIngredients={availableIngredients}
            onToggleMenuItem={toggleMenuItem}
            onSetBusinessPlan={setBusinessPlan}
            calculateIngredientsNeeded={calculateIngredientsNeeded}
          />
        )}

        {/* Step 3: Summary */}
        {currentStep === 3 && (
          <Step3Summary
            businessPlan={businessPlan}
            getRequiredIngredients={getRequiredIngredients}
            calculateIngredientsNeeded={calculateIngredientsNeeded}
          />
        )}

        </div>

        {/* Footer Buttons */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between">
            <Button
              variant="secondary"
              onClick={currentStep === 1 ? onClose : prevStep}
            >
              {currentStep === 1 ? 'ยกเลิก' : 'ย้อนกลับ'}
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceedToNextStep()}
              >
                ถัดไป
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'กำลังสร้าง...' : 'สร้างหน้าร้าน'}
              </Button>
            )}
          </div>
        </div>
      </div>{/* End Content wrapper */}
    </Modal>
  );
}