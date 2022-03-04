import {
  ActionFunction,
  Form,
  LoaderFunction,
  useActionData,
  useLoaderData,
} from "remix";
import { PLACEMENTS, Placement } from "~/placements.server";
import { buildXML, XMLOptions } from "~/xml.server";
import {
  buildErrorTracker,
  SerializedErrorTracker,
} from "~/xmlBuilder/errorTracker.server";
import { Field } from "~/xmlBuilder/Field";
import {
  Header,
  PlacementsList,
  Visibility,
  XMLDisplay,
} from "~/xmlBuilder/misc";
import { PlacementField } from "~/xmlBuilder/PlacementField";
import buildValidators from "~/xmlBuilder/validators.server";

export const action: ActionFunction = async ({ request }) => {
  const body = await request.formData();
  const getParam = (p: string) => body.get(p) as string;
  const getBooleanParam = (p: string) => Array.from(body.keys()).includes(p);

  const opts: XMLOptions = {
    title: getParam("tool_name"),
    description: getParam("description"),
    domain: getParam("tool_domain"),
    launchUrl: getParam("launch_url"),
    privacyLevel: getParam("privacy_level"),
    selectionHeight: getParam("selection_height"),
    selectionWidth: getParam("selection_width"),
    oauthCompliant: getBooleanParam("oauth_compliant"),
    visibility: getParam("visibility"),
    customFields: getParam("custom_fields"),
    placements: body.getAll("placements") as string[], // TODO change this bc placement data is now much more complex
  };

  const errorTracker = buildErrorTracker();
  const validators = buildValidators();
  errorTracker.add("custom_fields", validators.customFields(opts.customFields));

  return {
    xml: errorTracker.hasErrors() ? errorTracker.text : buildXML(opts),
    errorTracker: errorTracker.toJSON(),
    placements: PLACEMENTS,
  };
};

/**
 * Loader is only called on initial page load and so only
 * needs to supply empty data
 */
export const loader: LoaderFunction = () => {
  return {
    xml: buildXML({} as XMLOptions),
    errorTracker: buildErrorTracker().toJSON(),
    placements: PLACEMENTS,
  };
};

export default function Index() {
  const data = useActionData() || useLoaderData();
  const xml: string = data?.xml;
  const placements: Placement[] = data?.placements;
  const errorTracker: SerializedErrorTracker = data?.errorTracker;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <Header></Header>
      <h3>Configuration</h3>
      <p>
        (See the{" "}
        <a href="https://canvas.instructure.com/doc/api/file.tools_xml.html">
          Canvas API docs
        </a>{" "}
        for information on these options)
      </p>
      {errorTracker.hasErrors && (
        <p style={{ color: "red" }}>{errorTracker.text}</p>
      )}
      <Form method="post">
        <table>
          <Field name="Tool Name" inputName="tool_name"></Field>
          <Field name="Description" inputName="description"></Field>
          <Field name="Tool Domain" inputName="tool_domain"></Field>
          <Field name="Launch URL" inputName="launch_url"></Field>
          <Field name="Privacy Level">
            <select name="privacy_level">
              <option value="public">public</option>
              <option value="name_only">name_only</option>
              <option value="anonymous">anonymous</option>
            </select>
          </Field>
          <Field
            name="OAuth Compliant"
            inputName="oauth_compliant"
            type="checkbox"
            description="Does not copy launch URL query parameters to POST body when true"
          ></Field>
          <Visibility name="visibility"></Visibility>
          <Field
            name="Custom Fields"
            description="(key=value, one per line)"
            error={errorTracker.errors.custom_fields}
          >
            <textarea name="custom_fields" rows={3} cols={24}></textarea>
          </Field>
          <Field
            name="Selection Height"
            inputName="selection_height"
            type="number"
            defaultValue="500"
          ></Field>
          <Field
            name="Selection Width"
            inputName="selection_width"
            type="number"
            defaultValue="500"
          ></Field>
          <PlacementsList>
            {placements.map((p) => (
              <PlacementField
                placement={p}
                active={p.key === "course_navigation"} // TODO move this to loader only
              ></PlacementField>
            ))}
          </PlacementsList>
        </table>
        <button style={{ marginTop: "2em" }} type="submit">
          Generate
        </button>
      </Form>
      <XMLDisplay xml={xml} error={errorTracker.hasErrors}></XMLDisplay>
    </div>
  );
}
