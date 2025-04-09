/**
 * Workflow Analysis Engine
 * 
 * This file contains functions for analyzing workflow data, identifying bottlenecks,
 * and generating optimization suggestions.
 */

/**
 * Analyze the structure of a board and its workflow
 * @param {Object} boardData - Data for the board to analyze
 * @returns {Object} - Analysis results
 */
export const analyzeWorkflowStructure = async (boardData) => {
  try {
    // Analyze columns
    const columnsAnalysis = analyzeColumns(boardData.columns);
    
    // Analyze groups
    const groupsAnalysis = analyzeGroups(boardData.groups, boardData.items);
    
    // Analyze workflow efficiency
    const workflowAnalysis = analyzeWorkflowEfficiency(boardData.items);
    
    // Extract status transitions from activity logs (if available)
    let statusTransitions = {};
    if (boardData.activity_logs) {
      const statusChanges = extractStatusChanges(boardData.activity_logs);
      statusTransitions = analyzeStatusTransitions(statusChanges);
    }
    
    // Return complete analysis
    return {
      boardName: boardData.name,
      columns: columnsAnalysis,
      groups: groupsAnalysis,
      workflow: workflowAnalysis,
      statusTransitions
    };
  } catch (error) {
    console.error('Error analyzing workflow structure:', error);
    throw error;
  }
};

/**
 * Analyze columns for missing essential types and duplicates
 * @param {Array} columns - List of columns
 * @returns {Object} - Column analysis results
 */
const analyzeColumns = (columns) => {
  // Check for missing important columns
  const missingColumnTypes = [];
  const essentialColumnTypes = ['status', 'people', 'date', 'numbers'];
  
  const existingColumnTypes = columns.map(col => col.type);
  essentialColumnTypes.forEach(type => {
    if (!existingColumnTypes.includes(type)) {
      missingColumnTypes.push(type);
    }
  });
  
  // Check for duplicate columns
  const columnTitles = columns.map(col => col.title.toLowerCase());
  const duplicateTitles = columnTitles.filter(
    (title, index) => columnTitles.indexOf(title) !== index
  );
  
  // Generate recommended column additions
  const recommendedAdditions = missingColumnTypes.map(type => {
    switch(type) {
      case 'status': return { type: 'status', title: 'Status' };
      case 'people': return { type: 'people', title: 'Owner' };
      case 'date': return { type: 'date', title: 'Due Date' };
      case 'numbers': return { type: 'numbers', title: 'Time Estimate' };
      default: return { type, title: type.charAt(0).toUpperCase() + type.slice(1) };
    }
  });
  
  return {
    missingEssentialColumns: missingColumnTypes,
    duplicateColumns: [...new Set(duplicateTitles)],
    recommendedAdditions,
    efficiency: calculateColumnEfficiency(columns, missingColumnTypes)
  };
};

/**
 * Calculate column efficiency score (0-100)
 * @param {Array} columns - List of columns
 * @param {Array} missingTypes - List of missing column types
 * @returns {Number} - Efficiency score
 */
const calculateColumnEfficiency = (columns, missingTypes) => {
  const hasEssentials = 4 - missingTypes.length; // Out of 4 essential types
  const essentialsWeight = 0.7; // 70% of score based on essentials
  
  // Check for too many columns (over 10 becomes inefficient)
  const optimalColumnCount = 10;
  const columnCountScore = columns.length <= optimalColumnCount ? 
    1 : 1 - ((columns.length - optimalColumnCount) / 10);
  const columnCountWeight = 0.3; // 30% of score based on column count
  
  const efficiency = 
    (hasEssentials / 4 * essentialsWeight + columnCountScore * columnCountWeight) * 100;
  
  return Math.min(100, Math.max(0, Math.round(efficiency)));
};

/**
 * Analyze groups for logical workflow and item distribution
 * @param {Array} groups - List of groups
 * @param {Array} items - List of items
 * @returns {Object} - Group analysis results
 */
const analyzeGroups = (groups, items) => {
  // Check if groups follow a logical workflow
  const commonWorkflowOrders = [
    ['Backlog', 'To Do', 'In Progress', 'Done'],
    ['Planning', 'Development', 'Testing', 'Deployment'],
    ['Not Started', 'Working on it', 'Stuck', 'Done']
  ];
  
  const groupTitles = groups.map(g => g.title);
  
  let matchesKnownWorkflow = false;
  let bestMatchWorkflow = null;
  let matchScore = 0;
  
  for (const workflow of commonWorkflowOrders) {
    // Check if current groups match or are a subset of a known workflow
    const currentMatchScore = workflow.filter(stage => 
      groupTitles.some(title => title.toLowerCase().includes(stage.toLowerCase()))
    ).length / workflow.length;
    
    if (currentMatchScore > matchScore) {
      matchScore = currentMatchScore;
      bestMatchWorkflow = workflow;
      
      if (matchScore > 0.5) {  // More than half of the stages match
        matchesKnownWorkflow = true;
      }
    }
  }
  
  // Analyze group item distribution
  const itemsByGroup = {};
  items.forEach(item => {
    const groupId = item.group?.id;
    if (!groupId) return;
    
    if (!itemsByGroup[groupId]) {
      itemsByGroup[groupId] = 0;
    }
    
    itemsByGroup[groupId]++;
  });
  
  const groupDistribution = groups.map(group => ({
    groupId: group.id,
    groupName: group.title,
    itemCount: itemsByGroup[group.id] || 0
  }));
  
  // Identify unbalanced groups
  const imbalancedGroups = groupDistribution.filter(g => 
    g.itemCount > 20 || (g.itemCount === 0 && g.groupName.toLowerCase() !== 'done')
  );
  
  // Calculate group efficiency based on alignment with known workflows and distribution
  const workflowAlignmentScore = matchesKnownWorkflow ? matchScore : 0.3;
  const workflowAlignmentWeight = 0.6; // 60% of score based on workflow alignment
  
  // Calculate distribution score - penalize for imbalanced groups
  const distributionScore = 1 - (imbalancedGroups.length / groups.length);
  const distributionWeight = 0.4; // 40% of score based on distribution
  
  const efficiency = 
    (workflowAlignmentScore * workflowAlignmentWeight + 
     distributionScore * distributionWeight) * 100;
  
  return {
    matchesKnownWorkflow,
    bestMatchWorkflow,
    groupDistribution,
    imbalancedGroups,
    efficiency: Math.min(100, Math.max(0, Math.round(efficiency)))
  };
};

/**
 * Analyze workflow efficiency based on items and their data completeness
 * @param {Array} items - List of items
 * @returns {Object} - Workflow efficiency analysis
 */
const analyzeWorkflowEfficiency = (items) => {
  // Check for items missing critical information
  const incompleteItems = items.filter(item => {
    const columnValues = item.column_values || [];
    
    const hasStatus = columnValues.some(col => 
      (col.type === 'status' || col.id === 'status' || col.title?.toLowerCase() === 'status') && col.text
    );
    
    const hasOwner = columnValues.some(col => 
      (col.type === 'people' || col.id === 'person' || col.title?.toLowerCase().includes('owner') || 
       col.title?.toLowerCase().includes('assignee')) && col.text
    );
    
    const hasDueDate = columnValues.some(col => 
      (col.type === 'date' || col.id === 'date' || col.title?.toLowerCase().includes('due')) && col.text
    );
    
    return !hasStatus || !hasOwner || !hasDueDate;
  }).map(item => ({
    id: item.id,
    name: item.name,
    missingFields: []
      .concat(!item.column_values?.some(col => 
        (col.type === 'status' || col.id === 'status' || col.title?.toLowerCase() === 'status') && col.text
      ) ? ['status'] : [])
      .concat(!item.column_values?.some(col => 
        (col.type === 'people' || col.id === 'person' || col.title?.toLowerCase().includes('owner') || 
         col.title?.toLowerCase().includes('assignee')) && col.text
      ) ? ['owner'] : [])
      .concat(!item.column_values?.some(col => 
        (col.type === 'date' || col.id === 'date' || col.title?.toLowerCase().includes('due')) && col.text
      ) ? ['due date'] : [])
  }));
  
  // Calculate efficiency based on data completeness
  const completionRate = items.length > 0 ? 
    (items.length - incompleteItems.length) / items.length : 0;
  
  return {
    incompleteItems,
    efficiency: Math.round(completionRate * 100)
  };
};

/**
 * Extract status changes from activity logs
 * @param {Array} activityLogs - List of activity logs
 * @returns {Array} - Extracted status changes
 */
export const extractStatusChanges = (activityLogs) => {
  return activityLogs
    .filter(log => log.event === 'change_column_value' && log.data)
    .map(log => {
      // Parse the data field which contains the status change details
      let parsedData;
      try {
        parsedData = typeof log.data === 'string' ? JSON.parse(log.data) : log.data;
      } catch (e) {
        return null;
      }
      
      if (!parsedData.column_id || !parsedData.value) return null;
      
      // Only process status column changes
      const columnId = parsedData.column_id;
      const isStatusColumn = columnId === 'status' || 
                            columnId.includes('status') || 
                            parsedData.text?.toLowerCase().includes('status');
      
      if (!isStatusColumn) return null;
      
      let previousStatus, newStatus;
      
      try {
        // Status values are often JSON strings themselves
        previousStatus = parsedData.previous_value ? 
          (JSON.parse(parsedData.previous_value)?.label || parsedData.previous_value) : null;
        
        newStatus = parsedData.value ? 
          (JSON.parse(parsedData.value)?.label || parsedData.value) : null;
      } catch (e) {
        // If parsing fails, use the raw values
        previousStatus = parsedData.previous_value;
        newStatus = parsedData.value;
      }
      
      return {
        itemId: log.entity?.id,
        itemName: log.entity?.name,
        previousStatus,
        newStatus,
        timestamp: new Date(log.created_at),
        userId: log.user?.id,
        userName: log.user?.name
      };
    })
    .filter(change => change !== null && change.newStatus !== change.previousStatus);
};

/**
 * Calculate time spent in each status
 * @param {Array} statusChanges - List of status changes
 * @returns {Object} - Time in status data
 */
export const calculateTimeInStatus = (statusChanges) => {
  if (!statusChanges || statusChanges.length === 0) {
    return {};
  }
  
  // Group status changes by item
  const itemStatusChanges = {};
  
  // Organize by item
  statusChanges.forEach(change => {
    if (!change.itemId) return;
    
    if (!itemStatusChanges[change.itemId]) {
      itemStatusChanges[change.itemId] = [];
    }
    
    itemStatusChanges[change.itemId].push(change);
  });
  
  // For each item, calculate time in each status
  const itemTimeInStatus = {};
  
  Object.keys(itemStatusChanges).forEach(itemId => {
    // Sort changes by time
    const changes = itemStatusChanges[itemId].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    itemTimeInStatus[itemId] = { 
      itemName: changes[0].itemName, 
      statusDurations: {} 
    };
    
    // Calculate durations
    for (let i = 0; i < changes.length - 1; i++) {
      const status = changes[i].newStatus;
      if (!status) continue;
      
      const startTime = changes[i].timestamp;
      const endTime = changes[i + 1].timestamp;
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      
      if (!itemTimeInStatus[itemId].statusDurations[status]) {
        itemTimeInStatus[itemId].statusDurations[status] = 0;
      }
      
      itemTimeInStatus[itemId].statusDurations[status] += durationHours;
    }
    
    // Handle the last status (still active)
    const lastChange = changes[changes.length - 1];
    if (lastChange && lastChange.newStatus) {
      const status = lastChange.newStatus;
      const startTime = lastChange.timestamp;
      const endTime = new Date(); // Current time
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      
      if (!itemTimeInStatus[itemId].statusDurations[status]) {
        itemTimeInStatus[itemId].statusDurations[status] = 0;
      }
      
      itemTimeInStatus[itemId].statusDurations[status] += durationHours;
    }
  });
  
  // Calculate average time in each status across all items
  const statusTotalTime = {};
  const statusCount = {};
  
  Object.values(itemTimeInStatus).forEach(item => {
    Object.entries(item.statusDurations).forEach(([status, duration]) => {
      if (!statusTotalTime[status]) {
        statusTotalTime[status] = 0;
        statusCount[status] = 0;
      }
      
      statusTotalTime[status] += duration;
      statusCount[status]++;
    });
  });
  
  // Calculate averages
  const statusAverages = {};
  Object.keys(statusTotalTime).forEach(status => {
    statusAverages[status] = {
      averageTimeHours: statusTotalTime[status] / statusCount[status],
      totalItems: statusCount[status]
    };
  });
  
  return statusAverages;
};

/**
 * Analyze status transitions to identify workflow patterns
 * @param {Array} statusChanges - List of status changes
 * @returns {Object} - Status transition counts
 */
const analyzeStatusTransitions = (statusChanges) => {
  const transitions = {};
  
  statusChanges.forEach(change => {
    if (!change.previousStatus || !change.newStatus) return;
    
    const from = change.previousStatus;
    const to = change.newStatus;
    
    if (!transitions[from]) {
      transitions[from] = {};
    }
    
    if (!transitions[from][to]) {
      transitions[from][to] = 0;
    }
    
    transitions[from][to]++;
  });
  
  return transitions;
};

/**
 * Identify bottlenecks in the workflow
 * @param {Object} timeInStatus - Time in status data
 * @returns {Array} - Sorted list of bottlenecks
 */
export const identifyBottlenecks = (timeInStatus) => {
  if (!timeInStatus || Object.keys(timeInStatus).length === 0) {
    return [];
  }
  
  // Convert to array for sorting
  const statusTimes = Object.entries(timeInStatus).map(([status, data]) => ({
    status,
    averageTimeHours: data.averageTimeHours,
    itemCount: data.totalItems
  }));
  
  // Sort by average time (descending)
  statusTimes.sort((a, b) => b.averageTimeHours - a.averageTimeHours);
  
  // Filter out done/completed statuses, which are expected to have longer durations
  const filteredBottlenecks = statusTimes.filter(item => 
    !item.status.toLowerCase().includes('done') && 
    !item.status.toLowerCase().includes('complete')
  );
  
  // Calculate an average time across all statuses to identify outliers
  const avgTimeAllStatuses = statusTimes.reduce((sum, status) => sum + status.averageTimeHours, 0) / 
                            statusTimes.length;
  
  // Identify bottlenecks as statuses with times significantly higher than average
  // or simply use the top 3 longest status times if there aren't clear outliers
  const significantBottlenecks = filteredBottlenecks.filter(
    status => status.averageTimeHours > avgTimeAllStatuses * 1.5
  );
  
  return significantBottlenecks.length > 0 ? 
    significantBottlenecks : 
    filteredBottlenecks.slice(0, Math.min(3, filteredBottlenecks.length));
};

/**
 * Generate optimization suggestions based on workflow analysis
 * @param {Object} structureAnalysis - Structure analysis results
 * @param {Array} bottlenecks - Identified bottlenecks
 * @param {Object} boardData - Board data
 * @returns {Array} - Optimization suggestions
 */
export const generateOptimizationSuggestions = (structureAnalysis, bottlenecks, boardData) => {
  const suggestions = [];
  
  // Add suggestions based on column analysis
  if (structureAnalysis.columns && structureAnalysis.columns.missingEssentialColumns) {
    structureAnalysis.columns.missingEssentialColumns.forEach(columnType => {
      let title, description, benefits;
      
      switch (columnType) {
        case 'status':
          title = 'Add Status Column';
          description = 'Add a Status column to track the progress of items through your workflow';
          benefits = ['Track item progress', 'Visualize workflow', 'Enable automations'];
          break;
        
        case 'people':
          title = 'Add Owner Column';
          description = 'Add a People column to assign ownership to items';
          benefits = ['Clear accountability', 'Balance workload', 'Enable filtering by owner'];
          break;
          
        case 'date':
          title = 'Add Due Date Column';
          description = 'Add a Date column to track deadlines';
          benefits = ['Meet deadlines', 'Prioritize effectively', 'Plan capacity'];
          break;
          
        case 'numbers':
          title = 'Add Time Estimate Column';
          description = 'Add a Numbers column to track estimated effort/time';
          benefits = ['Improve planning', 'Compare estimates vs. actuals', 'Balance workload'];
          break;
          
        default:
          return; // Skip unknown column types
      }
      
      suggestions.push({
        category: 'Structure',
        title,
        description,
        impact: columnType === 'status' || columnType === 'people' ? 'High' : 'Medium',
        benefits
      });
    });
  }
  
  // Add suggestions based on group analysis
  if (structureAnalysis.groups) {
    // Suggest reorganizing groups if they don't match a known workflow
    if (!structureAnalysis.groups.matchesKnownWorkflow && structureAnalysis.groups.bestMatchWorkflow) {
      suggestions.push({
        category: 'Workflow',
        title: 'Reorganize Status Groups',
        description: `Reorganize your groups to follow a more standard workflow: ${structureAnalysis.groups.bestMatchWorkflow.join(' → ')}`,
        impact: 'Medium',
        benefits: [
          'Clearer workflow visualization',
          'Improved process understanding',
          'Better workflow analytics'
        ]
      });
    }
    
    // Suggest balancing groups with too many items
    const overloadedGroups = structureAnalysis.groups.imbalancedGroups
      .filter(g => g.itemCount > 20)
      .map(g => g.groupName);
      
    if (overloadedGroups.length > 0) {
      suggestions.push({
        category: 'Workflow',
        title: 'Balance Overloaded Groups',
        description: `The following groups have too many items (>20): ${overloadedGroups.join(', ')}. Consider breaking them down further.`,
        impact: 'Medium',
        benefits: [
          'Improved visibility',
          'Better manageability',
          'Reduced cognitive load'
        ]
      });
    }
  }
  
  // Add suggestions based on bottlenecks
  if (bottlenecks && bottlenecks.length > 0) {
    bottlenecks.slice(0, 2).forEach(bottleneck => {
      suggestions.push({
        category: 'Bottleneck',
        title: `Optimize "${bottleneck.status}" Stage`,
        description: `Items spend an average of ${Math.round(bottleneck.averageTimeHours)} hours in "${bottleneck.status}" status. Consider breaking down work or adding resources to this stage.`,
        impact: 'High',
        benefits: [
          'Reduced cycle time',
          'Improved throughput',
          'Better workflow balance'
        ]
      });
    });
  }
  
  // Add suggestions based on incomplete items
  if (structureAnalysis.workflow && structureAnalysis.workflow.incompleteItems?.length > 0) {
    const incompleteCount = structureAnalysis.workflow.incompleteItems.length;
    const totalItems = boardData.items?.length || 0;
    const incompletePercentage = Math.round((incompleteCount / totalItems) * 100);
    
    if (incompletePercentage > 20) {
      suggestions.push({
        category: 'Data Quality',
        title: 'Improve Data Completeness',
        description: `${incompletePercentage}% of items are missing critical information. Consider implementing required fields or automations to improve data quality.`,
        impact: 'Medium',
        benefits: [
          'Better data for decision-making',
          'Improved reporting accuracy',
          'Enhanced workflow automation'
        ]
      });
    }
  }
  
  // Add automation suggestions
  suggestions.push({
    category: 'Automation',
    title: 'Implement Status Change Notifications',
    description: 'Create an automation to notify item owners when their items change status',
    impact: 'Medium',
    benefits: [
      'Improved awareness',
      'Faster responses to status changes',
      'Reduced need for manual updates'
    ]
  });
  
  if (structureAnalysis.columns?.missingEssentialColumns.includes('date') === false) {
    suggestions.push({
      category: 'Automation',
      title: 'Implement Due Date Reminders',
      description: 'Create an automation to notify item owners when due dates are approaching',
      impact: 'High',
      benefits: [
        'Reduce missed deadlines',
        'Improve accountability',
        'Enhance priority management'
      ]
    });
  }
  
  return suggestions;
};

export default {
  analyzeWorkflowStructure,
  extractStatusChanges,
  calculateTimeInStatus,
  identifyBottlenecks,
  generateOptimizationSuggestions
};