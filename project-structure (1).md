# Monday.com AI Workflow Assistant - Project Structure

```
monday-ai-workflow-assistant/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── App.jsx
│   │   ├── Authentication/
│   │   │   ├── Login.jsx
│   │   │   └── AuthContext.jsx
│   │   ├── Layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── MainContent.jsx
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── WorkflowCard.jsx
│   │   │   └── StatsSummary.jsx
│   │   ├── WorkflowAnalysis/
│   │   │   ├── WorkflowAnalyzer.jsx
│   │   │   ├── BottleneckDetection.jsx
│   │   │   ├── EfficiencyMetrics.jsx
│   │   │   └── OptimizationSuggestions.jsx
│   │   ├── Visualization/
│   │   │   ├── WorkflowVisualization.jsx
│   │   │   ├── StatusFlowChart.jsx
│   │   │   ├── TimeInStatusChart.jsx
│   │   │   └── TeamWorkloadChart.jsx
│   │   ├── NLPInterface/
│   │   │   ├── NaturalLanguageInput.jsx
│   │   │   ├── QueryProcessor.jsx
│   │   │   └── ResponseDisplay.jsx
│   │   └── WorkspaceCreation/
│   │       ├── WorkspaceCreator.jsx
│   │       ├── TemplateSelection.jsx
│   │       └── WorkflowConfigurator.jsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── mondayApi.js
│   │   │   ├── authService.js
│   │   │   └── aiService.js
│   │   ├── analysis/
│   │   │   ├── workflowAnalysis.js
│   │   │   ├── bottleneckDetection.js
│   │   │   └── optimizationEngine.js
│   │   └── nlp/
│   │       ├── intentRecognition.js
│   │       ├── entityExtraction.js
│   │       └── claudeIntegration.js
│   ├── utils/
│   │   ├── graphqlClient.js
│   │   ├── dateUtils.js
│   │   └── dataTransformers.js
│   ├── hooks/
│   │   ├── useMondayContext.js
│   │   └── useWorkflowAnalysis.js
│   ├── assets/
│   │   ├── images/
│   │   └── styles/
│   │       ├── global.css
│   │       └── variables.css
│   ├── constants/
│   │   ├── apiConstants.js
│   │   └── analysisConstants.js
│   ├── context/
│   │   ├── MondayContext.jsx
│   │   └── AnalysisContext.jsx
│   ├── index.jsx
│   └── index.css
├── server/
│   ├── index.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── boards.js
│   │   └── analysis.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── boardController.js
│   │   └── analysisController.js
│   ├── services/
│   │   ├── mondayService.js
│   │   ├── analysisService.js
│   │   └── aiService.js
│   ├── utils/
│   │   ├── errorHandler.js
│   │   └── logger.js
│   └── middleware/
│       ├── authMiddleware.js
│       └── rateLimit.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── monday.code.js
```
