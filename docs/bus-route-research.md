# Bus routes and fares for the SAMAHAN preview

Checked 24 October 2026. This is a route-planning preview, not a verified transport service or live bus tracker.

## Included service

Route 3: Antipolo–Quiapo via Cubao, limited to its westbound Aurora section from Anonas toward Cubao. G-Liner's own website lists this service. Do not assume the physical destination sign says Gateway or EDSA. The instruction identifies the service and asks the passenger to confirm the Cubao drop-off with the conductor.

The preview connects the user's origin to a listed boarding stop with Geoapify walking directions, adds a bus ride along a published road shape, and adds walking directions from the selected drop-off to the destination. It does not invent an Ali Mall bus turn. A request for Ali Mall may use a bus stop on Aurora followed by a walk, if the available connections meet the limits.

The bus planner has four westbound stops, not arbitrary boarding anywhere on Aurora:

| Stop | Latitude | Longitude | Stop listing |
| --- | --- | --- | --- |
| Anonas | 14.6280333 | 121.0639384 | https://wikiroutes.info/en/stops/1730353 |
| Aurora / 20th Avenue | 14.6262522 | 121.0596598 | https://wikiroutes.info/en/stops/1730355 |
| Aurora / Miami Street | 14.625349 | 121.0578814 | https://wikiroutes.info/en/stops/1730357 |
| Araneta Center–Cubao, Aurora | 14.6226962 | 121.0523654 | https://wikiroutes.info/en/stops/1730359 |

These coordinates are the locations linked from those listings to Google Street View. They are not bus bays surveyed by the team. WikiRoutes' route page reports a last update of 12 July 2023, so the stop data is explicitly a preview, not proof of current boarding permission or operation. All four listings identify Route 3 toward Quiapo, rather than the opposite direction.

The bus path is a clipped section of Sakay's published trip T_SAKAY_4417, route DOTR:R_SAKAY_PUB_2154. It follows Aurora instead of connecting distant stops with a single diagonal. The separate stop pins are joined to this indicative path. Ride distance is measured along that path; it is an estimate, not a surveyed fare-stage distance. The full included segment is under the 5 km minimum-fare band.

Sources:

- Operator's own route listing: https://www.glinerbuses.com/ (also https://glinerbuses.com/index.php).
- Sakay route and shape: https://explore.sakay.ph/routes/DOTR%3AR_SAKAY_PUB_2154.
- Direction-specific crowdsourced stop list: https://wikiroutes.info/en/manila?routes=94008.

Sakay's published westbound stop list is sparse: it lists Asian College before the Cubao/General Aguinaldo stop. Its Anonas entry is on the opposite-direction trip. Do not copy that eastbound Anonas pin into this westbound preview. Do not use Sakay's older displayed 15 / 2.65 fare for the current estimate.

## Fare evidence

PTV's government news report dated 28 September 2026 reproduces the revised LTFRB guide amounts:

| City bus category | Regular, first 5 km | Student / senior / PWD, first 5 km | Regular per succeeding km | Discounted per succeeding km |
| --- | ---: | ---: | ---: | ---: |
| Ordinary | PHP 15.00 | PHP 12.00 | PHP 2.49 | PHP 1.99 |
| Air-conditioned | PHP 18.00 | PHP 14.50 | PHP 2.98 | PHP 2.38 |

Source: https://ptvnews.ph/ltfrb-releases-new-matrices-for-puv-fare-hikes-effective-sept-28/.

The app uses the air-conditioned city bus rule for the included preview. The ordinary rule is reference fare data; its presence does not claim an ordinary bus runs this line. The discounted aircon base is the published PHP 14.50, rather than multiplying 18 by 0.8 and displaying 14.40. No extra discount is stacked. Eligibility is not inferred from a user's account: the user selects the ticket type and must present valid ID when claiming the discount.

The existing calculator continues to return an unknown fare for unknown distance or rides beyond the first 5 km. Extending the route requires the actual fare matrix and rounding rules before enabling longer-distance totals. Provincial bus fares are a separate category and must not be substituted for city bus fares.

The direct LTFRB fare page returned HTTP 403 during this review, so this change relies on the government report, not a claim that the original matrix PDF was inspected. PIA independently reports that the revised guide must be posted in vehicles before the adjusted fare is collected:
https://pia.gov.ph/news/luzon/ncr/ltfrb-reminds-puv-operators-drivers-to-display-updated-fare-matrix.

## Q City Bus findings

The current QC government guide says the service is free, lists QC Hall–Cubao as Route 1, and instructs passengers to present a QCitizen ID:
https://quezoncity.gov.ph/qcitizen-guides/quezon-city-bus-service-program/.

Its linked Route 1 graphic lists 15th Avenue / Aurora on the trip toward Cubao, followed by Cubao (Araneta City). The reverse graphic does not repeat that stop. Treat the directions separately. This is not an Anonas/TIP pickup service, and it should not be advertised as a universal free alternative.

Route 1 is not enabled in this patch: exact current boarding/drop-off pins and its local road alignment have not been established. Route 3 of Q City Bus (Welcome Rotonda–Aurora/Katipunan) is a different service from commercial Route 3 (Antipolo–Quiapo); never join them by route number. Do not reuse the jeepney's 20th Avenue turn for either bus service.

## Implementation and integration

- `src/data/busCatalog.js`: separate bus data, provenance, stop pins, and road shape. This leaves Claude's `transitCatalog.js` jeepney work separate.
- `src/services/busRoutes.js`: bus-only preview builder; nearest eligible stops, forward travel only, walking access and egress, distance, and warnings.
- `src/services/transitRoutes.js`: import the bus builder and dispatch `preferredMode === "bus"` before the existing train/jeep handling. If Claude has changed this file, preserve both changes and keep this early dispatch.
- `src/data/fareRules.js`: government report source, check/effective dates, and published city-bus minimum discounts. Keep other fare rules intact.
- `src/components/directions/TripDetailsCard.jsx`: bus-specific empty-state and stop wording; source links. Preserve any jeepney wording Claude adds to the same component.
- `src/types/commute.d.ts`: optional preview/source-link metadata.
- Bus regression tests, plus existing tests updated to keep rejecting unlisted jeep services.

The nearest-stop search uses straight-line screening limits of 500 m for access and 900 m for egress, plus the existing draft service rectangle. It also rejects starts far beyond the segment endpoints and reverse journeys. These are conservative demo limits, not an official service boundary or a guarantee of sidewalk access; actual walking directions still come from Geoapify. The exact corridor polygon remains deferred.

`verified-local` is the project's existing local-data source label. It does not certify these buses: the bus line/stops have `verified: false`, the returned route has `preview: true`, and the screen displays the uncertainty warnings. The existing walking-only active-trip controller is unchanged: bus journeys are previews, with no bus GPS tracking, ETA, arrival notification, or automatic ride completion added here.

## Phone review

1. Pull this branch in a separate clean checkout or integrate its changes with the latest jeepney work. Keep the existing `.env.local` values.
2. Start the existing Android development build with `npx expo start --dev-client`.
3. Select Bus, TIP QC to Gateway Mall. Expect a walk to the listed Aurora / 20th stop, a bus ride toward Cubao, and the final walk. Expect PHP 18.00 regular or PHP 14.50 discounted.
4. Try TIP QC to Ali Mall. Expect a final walking leg from Aurora, with no bus path down the jeepney's Ali Mall branch.
5. Try Cubao to Anonas. Expect no included reverse bus route.
6. Check the preview warnings and source links. Confirm the bus screen says loading area/drop-off, not platform.
7. Repeat a walking trip and both LRT preview directions after integrating the jeepney changes.

Automated checks cover route dispatch, sourced path clipping, nearby boarding, Ali Mall walking egress, reverse/outside-area rejection, cancellation, missing walking connections, bus fare bands, and both ticket types. They do not establish present-day bus operations or replace a phone/field check.
