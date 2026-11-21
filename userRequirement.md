—--
Systematic Changes
-debug mode also goes through an explanation indicating where went wrong.
-embed all demographics questions and quantitative questions in the demo.

- Assigned tasks need to be in random order, the change proposed needs to be in random order (at least 1 necessary change)

In General
R2 should cover goals that overlap or change.
R5 should cover navigating between an explanation and the code needed to interpret it.
R6 should recognize that a learner can correctly conclude a proposed fix has no effect.
R2: Assistance aligned with learners’ current goals
E1 questioned the separation between understanding and fixing code, and E1 and E3 identified difficulties changing assistance goals. These observations suggest that goal alignment needs to continue throughout the interaction. The existing criterion also treats any clarification or prompt revision as a failure, even when learners intentionally change their goals.
Requirement: When seeking AI assistance during independent programming, university programming learners need assistance that reflects their current goals, including completing the task, understanding the code, or both, as those goals evolve.
Success criteria: Learners can communicate their goals and obtain assistance consistent with them. When their goals change, learners can update the requested assistance while retaining relevant information already provided.
R5: Understanding explanations in relation to relevant code
E5 found code highlighting useful, supporting the original requirement. However, E3 reported difficulty revisiting explanations or navigating directly to relevant code, and E5 found that the change preview provided insufficient surrounding code. Locating a highlighted line therefore provides only part of the evidence needed to assess this requirement.
Requirement: When reviewing AI explanations of code, university programming learners need to connect the explanations to the relevant code and understand those connections within the surrounding program.
Success criteria: Learners can locate the code referenced by an explanation, access the surrounding code needed to interpret it, and describe the relationship between the explanation and the code. They can revisit previously discussed code and its explanation when needed.
Removing “their own code” also accommodates the situation E1 raised, where learners seek help understanding code written by someone else.
R6: Understanding the reasoning behind a proposed fix
E4 and E5 identified a misleading explanation for the deliberately ineffective operand-swap suggestion. This reveals a limitation in the existing success criterion, which assumes that a suggested change addresses the failure. The requirement should support learners in reasoning about a proposal even when its explanation is incomplete or incorrect.
Requirement: When reviewing an AI-proposed fix, university programming learners need to understand the explanation of the original failure and the reasoning connecting the proposed change to that failure.
Success criteria: Learners can explain the proposed cause of the failure and describe how the suggested change would affect the relevant code behavior. They can explain whether the stated rationale supports the proposed fix and identify questions or uncertainties that require further investigation.
This preserves R6’s focus on understanding. R7 continues to address determining whether the problem has been resolved using available tests, observed behavior, and reasoning. Subsequent evaluation should recognize a learner’s justified rejection of an ineffective proposal as a successful outcome for R6.
R8: Maintaining control before and after applying changes
The existing requirement expresses the need for control, but its original success criteria mainly assess understanding of a proposal. E2’s request for selective acceptance, E4’s uncertainty about change selection, E3’s confusion about change history, and E2 and E5’s concerns about undo show that control also involves knowing what has taken effect and recovering from an unwanted edit.
Requirement: When reviewing and applying AI-proposed code modifications, university programming learners need to control which changes take effect, understand the resulting code state, and recover from unwanted changes.
Success criteria: Learners can identify the scope of proposed modifications and decide which changes to apply or reject. After acting, they can identify which changes took effect and restore the code affected by an unwanted change to its previous state.

GPT generated Form below

Problem
Evaluators Findings
Requirement

1. Goals were hard to express and change.
   A learner might want both a fix and an explanation, but the modes appeared to require a choice. The selected goal was hard to see. Later, Edit did not clearly indicate that it changed the goal or whether current edits would be preserved. Understand My Code also sounded limited to code the learner wrote.
   R2, R8
2. Learners could not tell exactly what information the AI would use.
   The goal, problem, rules, and knowledge fields had unclear or overlapping purposes. It was difficult to tell which files would be sent, whether saved output would accompany the next request, or what Response Context added. Sharing a few relevant lines required uploading the whole file.
   R2, R4
3. Explanations pointed to code, but were hard to explore.
   Highlighting helped identify the line under discussion. However, learners could not easily jump to a function, revisit an earlier explanation, or ask a follow-up while viewing it. The change preview sometimes showed too little surrounding code to judge the edit.
   R5, R6
4. The interface gave weak guidance about what to do next.
   Code, explanations, progress, and actions competed for attention. It was unclear where to start, what Make Smaller or Mark Done would do, and whether the learner or the AI was responsible for running the code. Crowded controls, typos, and inconsistent labels added friction.
   R3, R5, R6
5. The explanation could make an ineffective edit sound justified.
   The clearest example was the proposed swap of the operands in an integer equality comparison. The preview implied that the change would improve match detection even though it preserved the result. Elsewhere, expected result referred both to what the buggy code would produce and to what correct code should produce.
   R3, R6, R8
6. Control over edits was incomplete.
   Apply/Reject gave learners a choice, but they could not reliably tell which edits were selected, which had taken effect, or how to undo one. View Affected, change history, and rejection feedback were also unclear. Evaluators wanted different levels of control: one wanted a faster way to accept a fix, while another wanted to accept only selected lines.
   R2, R6, R8
7. Test feedback showed failure without adequately supporting diagnosis.
   Learners could see expected and actual values, but generic check names obscured what was tested. It was unclear who supplied the checks, how to add one, or which code to investigate after failure. Next Step remained prominent, and the interface did not show that the same check had failed after two different edits.
   R3, R6, R9
8. Recovery options were available, but their consequences were unclear.
   Learners could not easily distinguish New Request, Still Stuck, and New Approach. Some recovery instructions referenced an internal screen name or a code path the example never reached. The Office Hours draft also left its sharing status unclear and could claim the learner had tried steps they had skipped.
   R4, R9
