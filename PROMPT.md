@activity.md

We are rebuilding the project from scratch in this repo.

At all stages of operation, append the a summary of the currently executing work to CURRENT_TASK.md. Never leave this file without updates for more than 10 seconds during execution... It needs to be constantly updated.

First read activity.md to see what was recently accomplished.

If needed, start the site locally. If port is taken, try another port.

Analyze all the GitHub issues and pick the one from Stage 1 that you determine has the highest priority and isn't blocked by other unfinished work. Make sure all sub-issues are completed separately before starting the parent issue. Ensure we have completed all tasks in one stage before moving on to the next stage. If all issues are complete, output <promise>COMPLETE</promise>.

ONLY SELECT ISSUES FROM STAGE 1

Clear the contents of CURRENT_TASK.md, and update with a link to the issue you've selected.

During implementation, update CURRENT_TASK.md with a detailed log of implementation and testing progress. If there are any long-running processes, update the CURRENT_TASK.md file regularly during the task execution informing that the task is still running.

Work on exactly ONE issue: implement the change.

Run all tests and think deeply about how to fully test the acceptance criteria (found in the github issue or in the /docs/specs folder). 

If any tests fail or any acceptance criteria is not satisfied, make changes and repeat until we have full compliance with all tests and acceptance criteria.

DO NOT CONTINUE IF ANY TESTS FAIL OR IF THE ACCEPTANCE CRITERIA ARE NOT MET

After implementing, if needed, use Playwright to:
1. Navigate to the local server URL
2. Take a screenshot and save it as screenshots/[task-name].png

Append a dated progress entry to activity.md describing what you changed and the screenshot filename.

Do not git init, do not change remotes.

ONLY WORK ON A SINGLE TASK.

When fully finished, make one git commit for that task only with a clear message.

Push the changes to GitHub and mark the issue as complete.  

