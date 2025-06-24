import os
from azure.devops.connection import Connection
from msrest.authentication import BasicAuthentication
from azure.devops.v7_1.work_item_tracking import WorkItemTrackingClient
from azure.devops.v7_1.work import WorkClient
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AzureDevOpsClient:
    def __init__(self):
        """Initialize the Azure DevOps client using environment variables"""
        self.organization_url = os.getenv("AZURE_DEVOPS_ORG_URL")
        self.project_name = os.getenv("AZURE_DEVOPS_PROJECT_NAME")
        self.team_name = os.getenv("AZURE_DEVOPS_TEAM_NAME")
        self.pat = os.getenv("AZURE_DEVOPS_PAT")
        self.current_iteration = os.getenv("CURRENT_ITERATION")
        
        # Validate required environment variables
        if not all([self.organization_url, self.project_name, self.team_name, self.pat]):
            raise ValueError("Missing required Azure DevOps configuration in .env file")
        
        # Create a connection to Azure DevOps
        credentials = BasicAuthentication('', self.pat)
        self.connection = Connection(base_url=self.organization_url, creds=credentials)
        
        # Get clients for different services
        self.work_item_client = self.connection.clients.get_work_item_tracking_client()
        self.work_client = self.connection.clients.get_work_client()
    
    def get_current_sprint_details(self) -> Dict[str, Any]:
        """
        Get details about the current sprint
        """
        if not self.current_iteration:
            # If no current iteration is specified, try to get the current one
            team_context = {"project": self.project_name, "team": self.team_name}
            iterations = self.work_client.get_team_iterations(team_context, "$timeframe=current")
            if not iterations:
                return {"error": "No active sprint found"}
            iteration = iterations[0]
        else:
            # Get the specified iteration
            team_context = {"project": self.project_name, "team": self.team_name}
            iterations = self.work_client.get_team_iterations(team_context)
            iteration = next((i for i in iterations if i.path == self.current_iteration), None)
            if not iteration:
                return {"error": f"Iteration {self.current_iteration} not found"}
        
        return {
            "id": iteration.id,
            "name": iteration.name,
            "path": iteration.path,
            "start_date": iteration.attributes.start_date,
            "finish_date": iteration.attributes.finish_date,
            "time_frame": iteration.attributes.time_frame
        }
    
    def get_sprint_work_items(self, iteration_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get work items for the current sprint or specified iteration
        """
        if not iteration_path and self.current_iteration:
            iteration_path = self.current_iteration
        
        if not iteration_path:
            # If no iteration is specified, try to get the current one
            sprint_details = self.get_current_sprint_details()
            if "error" in sprint_details:
                return [{"error": sprint_details["error"]}]
            iteration_path = sprint_details["path"]
        
        # Create WIQL query to get work items in the iteration
        wiql = f"""
        SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [Microsoft.VSTS.Scheduling.RemainingWork]
        FROM WorkItems
        WHERE [System.TeamProject] = '{self.project_name}'
        AND [System.IterationPath] = '{iteration_path}'
        AND [System.WorkItemType] IN ('User Story', 'Bug', 'Task')
        ORDER BY [System.State] ASC, [Microsoft.VSTS.Common.Priority] ASC
        """
        
        wiql_results = self.work_item_client.query_by_wiql({"query": wiql}).work_items
        if not wiql_results:
            return []
        
        # Get work item details
        work_item_ids = [result.id for result in wiql_results]
        work_items = self.work_item_client.get_work_items(work_item_ids, expand="Relations")
        
        # Format the results
        formatted_items = []
        for item in work_items:
            fields = item.fields
            formatted_items.append({
                "id": item.id,
                "title": fields.get("System.Title", ""),
                "type": fields.get("System.WorkItemType", ""),
                "state": fields.get("System.State", ""),
                "assigned_to": fields.get("System.AssignedTo", {}).get("displayName", "Unassigned") if isinstance(fields.get("System.AssignedTo"), dict) else "Unassigned",
                "remaining_work": fields.get("Microsoft.VSTS.Scheduling.RemainingWork", 0),
                "url": f"{self.organization_url}/{self.project_name}/_workitems/edit/{item.id}"
            })
        
        return formatted_items
    
    def get_sprint_burndown(self) -> Dict[str, Any]:
        """
        Get burndown data for the current sprint
        """
        team_context = {"project": self.project_name, "team": self.team_name}
        
        # Get current iteration if not specified
        if not self.current_iteration:
            iterations = self.work_client.get_team_iterations(team_context, "$timeframe=current")
            if not iterations:
                return {"error": "No active sprint found"}
            iteration = iterations[0]
        else:
            iterations = self.work_client.get_team_iterations(team_context)
            iteration = next((i for i in iterations if i.path == self.current_iteration), None)
            if not iteration:
                return {"error": f"Iteration {self.current_iteration} not found"}
        
        # Get the burndown chart data
        try:
            burndown = self.work_client.get_board_chart_by_name(
                team_context=team_context,
                board="Stories",
                name="Burndown"
            )
            return burndown
        except Exception as e:
            return {"error": f"Failed to get burndown data: {str(e)}"}
    
    def get_team_members(self) -> List[Dict[str, Any]]:
        """
        Get team members for the current team
        """
        team_context = {"project": self.project_name, "team": self.team_name}
        
        try:
            # Get team client
            team_client = self.connection.clients.get_team_client()
            team_members = team_client.get_team_members(self.project_name, self.team_name)
            
            # Format the results
            formatted_members = []
            for member in team_members:
                formatted_members.append({
                    "id": member.id,
                    "display_name": member.identity.display_name,
                    "unique_name": member.identity.unique_name,
                    "email": getattr(member.identity, "email", None) or member.identity.unique_name
                })
            
            return formatted_members
        except Exception as e:
            return [{"error": f"Failed to get team members: {str(e)}"}]

# Create a singleton instance
azure_devops = AzureDevOpsClient()
